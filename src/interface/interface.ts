export type Points = (
    startDate?: Date,
    endDate?: Date,
    channelId?: string,
    scores?: any,
    description?: string,
    toUserId?: string,
    fromUserId?: string,
) => any;

export interface Events {
    (
        item?: string,
        operation?: string,
        channel?: string,
        userVoting?: string,
        description?: string,

    )
        : Promise<string>
}