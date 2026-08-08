import CopyWebpackPlugin from 'copy-webpack-plugin';
import path from 'path';
import webpack from 'webpack';

const config: webpack.Configuration = {
    entry: {
        background: path.resolve(process.cwd(), 'firefox/src/background.ts'),
        list_editor: path.resolve(process.cwd(), 'firefox/src/list_editor.ts'),
        popup: path.resolve(process.cwd(), 'firefox/src/popup.ts'),
        settings: path.resolve(process.cwd(), 'firefox/src/settings.ts'),
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        onlyCompileBundledFiles: true,
                    },
                },
                exclude: /node_modules/,
            },
        ],
    },
    output: {
        filename: 'js/[name].js',
        path: path.resolve(process.cwd(), 'dist/firefox'),
        clean: true,
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: 'firefox/manifest.json' },
                { from: 'static' },
                {
                    from: 'assets',
                    to: 'img',
                    globOptions: { ignore: ['**/*_dark.png', '**/*.ase'] },
                },
            ],
        }),
    ],
};

export default config;
