# XtraPath Local Agent

This is the Universal Local Agent for XtraPath. It allows users to run heavy backend tasks (like Manim rendering) directly on their local machines, completely eliminating server costs for XtraPath.

## Features
- **One Command Connection**: Just run the agent and it listens for commands from your web browser.
- **Auto-Dependency Installation**: If a user doesn't have Manim installed, the agent will silently install it via `pip` the first time they try to render something.
- **Universal Task Runner**: Currently supports `manim`. Can be easily expanded to support `latex`.

## How to use (For Users)

1. Make sure you have Python installed.
2. In your terminal, run:
   ```bash
   pip install -r requirements.txt
   python agent.py
   ```
3. Return to the XtraPath website. It will now automatically route rendering tasks to your local machine!

## Security
This agent is locked down. It does not accept arbitrary shell commands. It only accepts specific `task_type` payloads (like `manim`) and hardcodes the execution sandbox.
