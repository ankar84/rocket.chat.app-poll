import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IUIKitBlockIncomingInteraction } from '@rocket.chat/apps-engine/definition/uikit/UIKitIncomingInteractionTypes';

import { createPollBlocks } from './createPollBlocks';
import { getPoll } from './getPoll';
import { storeVote } from './storeVote';

export async function votePoll({ data, read, persistence, modify, pollIndex, totalPolls }: {
    data: IUIKitBlockIncomingInteraction,
    read: IRead,
    persistence: IPersistence,
    modify: IModify,
    pollIndex?: number,
    totalPolls?: number,
}) {
    if (!data.message) {
        return {
            success: true,
        };
    }

    const poll = await getPoll(String(data.message.id), read);
    if (!poll) {
        throw new Error('no such poll');
    }

    if (poll.finished) {
        throw new Error('poll is already finished');
    }

    await storeVote(poll, parseInt(String(data.value), 10), data.user, { persis: persistence });

    const message = await modify.getUpdater().message(data.message.id as string, data.user);
    message.setEditor(message.getSender());

    const block = modify.getCreator().getBlockBuilder();

    const showNames = await read.getEnvironmentReader().getSettings().getById('use-user-name');
    const timeZone = await read.getEnvironmentReader().getSettings().getById('timezone');

    createPollBlocks(block, poll.question, poll.options, poll, showNames.value, timeZone.value, poll.anonymousOptions);

    message.setBlocks(block);

    return modify.getUpdater().finish(message);
}
