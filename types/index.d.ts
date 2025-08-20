declare interface Room {
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
    message: string;
    payload: any;
};

declare interface Agent {
    id: string;
    email: string;
    name: string;
    customerCount: number;
}
