# sino-tg-bot

SINO Is Not Object!

This is a Telegram bot built with TypeScript using the Telegraf framework.

## Description

This bot provides basic functionality such as responding to commands, echoing text, sending images, and handling stickers. It also includes a privileged command for executing shell commands.

## Features

* `/start`:  Greets the user and provides a welcome message.
* `/help`:  Displays a list of available commands.
* `/echo [text]`:  Echoes the provided text.
* `/img`:  Sends a random cat image.
* `/shell`:  (Privileged) Executes shell commands.  Use with caution!

## Usage

1. Clone the repository:

   ```bash
   git clone https://github.com/SessionHu/sino-tg-bot.git
   ```
2. Install dependencies and build:

   ```bash
   yarn && yarn build
   ```
3. Set up your `.env` file:

   ```
   BOT_TOKEN=YOUR_BOT_TOKEN
   ```

   Replace `YOUR_BOT_TOKEN` with the token you obtained from BotFather on Telegram.
4. Run the bot:

   ```bash
   yarn start
   ```

## Environment Variables

* `BOT_TOKEN`: The Telegram bot token.

## Contributing

We welcome contributions! Please feel free to submit pull requests or open issues to report bugs or suggest new features.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
