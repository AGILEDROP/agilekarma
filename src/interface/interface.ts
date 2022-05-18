export interface Points {
    (startDate?: Date,
        endDate?: Date,
        channelId?: string,
        scores?: any,
        description?: string,
        toUserId?: string,
        fromUserId?: string,
    )
        : any
}