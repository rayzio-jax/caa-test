declare interface Room {
    id: string;
    room_id: number;
    channel_id: number;
    agent_id?: number;
    status: "QUEUE" | "HANDLED" | "RESOLVED";
    created_at: Date;
    updated_at: Date;
}

declare type Payload = {
    status: string;
    message: string;
    payload: any;
};

declare interface FilteredAgents {
    agents: Agent[];
    count: number;
}

declare interface Agent {
    id: number;
    email: string;
    name: string;
    current_customer_count: number;
    user_channels: {
        id: number;
        name: string;
    }[];
}
