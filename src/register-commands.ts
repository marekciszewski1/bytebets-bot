import "dotenv/config";
import { registerSlashCommands } from "./commands/registerSlashCommands.js";

try {
  const result = await registerSlashCommands();
  if (result.scope === "guild") {
    console.log(`Registered ${result.count} command(s) to guild ${result.guildId}`);
  } else {
    console.log(
      `Registered ${result.count} global command(s) (may take up to ~1 hour to appear everywhere)`
    );
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}
