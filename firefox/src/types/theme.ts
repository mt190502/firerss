export interface Theme {
    colors: {
        [key: string]: {
            background: string;
            foreground: string;
            active: string;
            inactive: string;
        };
    };
}
