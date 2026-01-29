import { SessionModel } from "#lib/database/models/multiSessions.js";

export default {
	name: "sessions",
	aliases: ["listsessions"],
	category: "owner",
	desc: "List all connected bot sessions",
	async run({ m }) {
		const sessions = await SessionModel.list();

		if (!sessions.length) {
			return m.reply("❌ No active sessions found.");
		}

		let text = "📱 *Active Bot Sessions*\n\n";

		for (const s of sessions) {
			text += `• ${s.phone}\n`;
		}

		m.reply(text);
	},
};
