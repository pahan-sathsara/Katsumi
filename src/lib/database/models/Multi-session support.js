import { getCollection } from "#lib/database/db";

const COLLECTION = "sessions";

export class SessionModel {
	static async add(sessionId, phone) {
		const col = await getCollection(COLLECTION);
		await col.updateOne(
			{ _id: sessionId },
			{
				$set: {
					phone,
					connected: true,
					updatedAt: Date.now(),
				},
			},
			{ upsert: true }
		);
		return this.get(sessionId);
	}

	static async setConnected(sessionId, connected) {
		const col = await getCollection(COLLECTION);
		await col.updateOne(
			{ _id: sessionId },
			{ $set: { connected } }
		);
	}

	static async remove(sessionId) {
		const col = await getCollection(COLLECTION);
		await col.deleteOne({ _id: sessionId });
	}

	static async list() {
		const col = await getCollection(COLLECTION);
		return col.find({}).toArray();
	}

	static async get(sessionId) {
		const col = await getCollection(COLLECTION);
		return col.findOne({ _id: sessionId });
	}
}
