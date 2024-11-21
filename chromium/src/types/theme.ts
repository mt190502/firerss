export interface Theme {
    theme: string;
    author: string;
    colors: {
        [key: string]: {
            background: string;
            foreground: string;
            active: string;
            inactive: string;
            selection: string;
            comment: string;
            cyan: string;
            green: string;
            orange: string;
            pink: string;
            purple: string;
            red: string;
            yellow: string;
        };
    };
}
