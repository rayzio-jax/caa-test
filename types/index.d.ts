declare interface Rooms {
    id: string;
    room_id: string;
    channel_id: string;
    agent_id?: string;
    status: "QUEUE" | "HANDLED" | "RESOLVED";
    created_at: Date;
    updated_at: Date;
}

declare type Payload = {
    status: string;
    payload: any;
};
