declare type ClientOptions = {
    host: string;
    port: number;
    contactPoints: string[];
    keyspace?: string;
    authProvider?: {
        username: string;
        password: string;
    };
};
export declare function getClientOptions(connectionOption: string, database?: string): ClientOptions;
export {};
