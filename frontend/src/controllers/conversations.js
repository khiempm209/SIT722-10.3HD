const Conversations = require("../models/Conversations");

exports.addConversation =  async (req, res) => {
    try {
        const { id, user_id, edit_time, name, user_text, bot_text } = req.body;
        
        const newConversation = new Conversations({
            id: id,
            user_id: user_id,
            edit_time: edit_time,
            name: name,
            history: [['USER', user_text], ['BOT', bot_text]]
        });
        
        await newConversation.save();
        res.status(200).json(newConversation);
    } catch (error) {
        res.status(500).json({ message: 'Error adding conversation', error: error.message });
    }
};

exports.updateConversation = async (req, res) => {
    try {
        const { id, user_text, bot_text, edit_time } = req.body;
        const pushInformation = [['USER', user_text], ['BOT', bot_text]];

        const update = {
            $push: { history: { $each: pushInformation } },
            $set: { edit_time: edit_time },
        };
        const updatedConversation = await Conversations.findOneAndUpdate(
            { id: id },
            update,
            { new: true }
        ).exec();

        if (!updatedConversation) {
            return res.status(404).json({ message: 'Cannot find the conversation' });
        }
        res.status(200).json(updatedConversation);
    } catch (error) {
        res.status(500).json({ message: 'Cannot update the conversation', error: error.message });
    }
};

exports.findConversationsByUser = async (req, res) => {
    try {
        const { user_id } = req.body;
        const userConversations = await Conversations.find({ user_id: user_id }).sort({ edit_time: -1 }).select("id edit_time name history");
        res.status(200).json(userConversations);
    } catch (error) {
        res.status(500).json({ message: 'Cannot find the conversation', error: error.message });
    }
};

exports.deleteConversationById = async (req, res) => {
    try {
        const { id } = req.body;
        const deleteResult = await Conversations.deleteOne({ id: id });
        res.status(200).json({message: `Deleted count: ${deleteResult.deletedCount}`});
    } catch (error) {
        res.status(500).json({ message: 'Cannot find the conversation', error: error.message });
    }
}