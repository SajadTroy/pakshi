require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const mongoose = require('mongoose');
const Post = require('./models/Post');
const Profile = require('./models/Profile');
const Follower = require('./models/Follower');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const PREFIX = ';';
const cooldowns = new Map();
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const MAX_ATTACHMENT_SIZE = 8 * 1024 * 1024; // 8MB (Discord free bot limit)
const POSTS_PER_PAGE = 10;

// Connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('[INFO] Connected to MongoDB'))
    .catch((err) => console.error('[ERROR] MongoDB connection error:', err));

client.on('ready', () => {
    console.log(`[INFO] Logged in as ${client.user.tag}!`);
    console.log(`[INFO] Bot is in ${client.guilds.cache.size} guilds`);
});

const userCache = new Map();
async function getUserTag(userId) {
    if (userCache.has(userId)) return userCache.get(userId);
    try {
        const user = await client.users.fetch(userId);
        userCache.set(userId, user.tag);
        return user.tag;
    } catch {
        return 'Unknown User';
    }
}

client.on('messageCreate', async (message) => {
    console.log(`[DEBUG] Message received: ${message.content} from ${message.author.tag} in ${message.channel.type} channel`);

    if (message.author.bot) {
        console.log('[DEBUG] Ignoring bot message');
        return;
    }
    if (!message.content.startsWith(PREFIX)) {
        console.log('[DEBUG] Message does not start with prefix');
        return;
    }

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    console.log(`[DEBUG] Command: ${command}, Args: ${args.join(' ')}`);

    // Help Command
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('📜 PakshiBot Help')
            .setDescription('Here are all available commands for PakshiBot, your social media-like Discord bot!')
            .setColor('#0099ff')
            .addFields(
                {
                    name: ';post [message]',
                    value:
                        'Create a post with optional hashtags and attachments (images: PNG/JPG/GIF, videos: MP4/WEBM, e.g., `;post Hello #world` with an image). Others can like (❤️) or dislike (👎) it.',
                    inline: false,
                },
                {
                    name: ';setprofile [bio]',
                    value: 'Set your profile bio (e.g., `;setprofile I love coding!`).',
                    inline: false,
                },
                {
                    name: ';profile [@user]',
                    value: 'View your or another user’s profile (e.g., `;profile` or `;profile @friend`).',
                    inline: false,
                },
                {
                    name: ';follow @user',
                    value: 'Follow a user to get notified of their posts (e.g., `;follow @friend`).',
                    inline: false,
                },
                {
                    name: ';search #hashtag',
                    value: 'Search posts by hashtag (e.g., `;search #world`).',
                    inline: false,
                },
                {
                    name: ';feed',
                    value: 'View recent posts from users you follow.',
                    inline: false,
                },
                {
                    name: ';userfeed [@user]',
                    value: 'View recent posts by a specific user with pagination (e.g., `;userfeed @friend`).',
                    inline: false,
                },
                {
                    name: ';userpost [@user] [number]',
                    value: 'View a specific post by a user (e.g., `;userpost @friend 3` for their 3rd most recent post).',
                    inline: false,
                },
                // {
                //   name: ';deleteprofile',
                //   value: 'Delete your profile, posts, and follow data.',
                //   inline: false,
                // },
                {
                    name: ';help',
                    value: 'Show this help message.',
                    inline: false,
                }
            )
            .setFooter({ text: `Prefix: ${PREFIX} | Made with ❤️ by PakshiBot` })
            .setTimestamp();

        try {
            await message.channel.send({ embeds: [embed] });
            console.log(`[DEBUG] Help command executed for ${message.author.tag}`);
        } catch (err) {
            console.error(`[ERROR] Failed to send help: ${err.message}`);
            message.reply('Error displaying help.');
        }
        return;
    }

    // Post Command
    if (command === 'post') {
        const now = Date.now();
        const cooldownAmount = 60 * 1000;
        if (cooldowns.has(message.author.id)) {
            const expiration = cooldowns.get(message.author.id) + cooldownAmount;
            if (now < expiration) {
                console.log(`[DEBUG] User ${message.author.tag} on cooldown`);
                return message.reply('Please wait before posting again!');
            }
        }
        cooldowns.set(message.author.id, now);
        setTimeout(() => cooldowns.delete(message.author.id), cooldownAmount);

        const content = args.join(' ') || ' ';
        console.log(`[DEBUG] Post content: "${content}"`);

        // Process attachments
        const attachments = message.attachments.filter(
            (att) =>
                (ALLOWED_IMAGE_TYPES.includes(att.contentType) || ALLOWED_VIDEO_TYPES.includes(att.contentType)) &&
                att.size <= MAX_ATTACHMENT_SIZE
        );
        console.log(
            `[DEBUG] Attachments: ${attachments.size} valid (${[...attachments.values()]
                .map((att) => `${att.name} (${att.contentType})`)
                .join(', ')})`
        );

        if (!content.trim() && attachments.size === 0) {
            console.log('[DEBUG] No content or valid attachments provided for post');
            return message.reply('Please provide a message or valid image/video attachments!');
        }

        const hashtags = content.match(/#[^\s#]+/g)?.map((tag) => tag.slice(1)) || [];
        const post = new Post({
            userId: message.author.id,
            content,
            hashtags,
            attachments: attachments.map((att) => att.url), // Store attachment URLs
        });

        try {
            await post.save();
            console.log(`[DEBUG] Post saved: ${post._id}`);
        } catch (err) {
            console.error(`[ERROR] Failed to save post: ${err.message}`);
            return message.reply('Error saving post.');
        }

        const embed = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setDescription(content)
            .setColor('#0099ff')
            .setTimestamp()
            .setFooter({ text: `Likes: 0 | Dislikes: 0 | Post ID: ${post._id}` });

        // Add first image to embed
        const firstImage = attachments.find((att) => ALLOWED_IMAGE_TYPES.includes(att.contentType));
        if (firstImage) {
            embed.setImage(firstImage.url);
            console.log(`[DEBUG] Added image to embed: ${firstImage.url}`);
        }

        // Add video URLs to description
        const videos = attachments.filter((att) => ALLOWED_VIDEO_TYPES.includes(att.contentType));
        if (videos.size > 0) {
            const videoLinks = videos.map((att) => `[Video: ${att.name}](${att.url})`).join('\n');
            embed.setDescription(`${content}\n\n${videoLinks}`);
            console.log(`[DEBUG] Added video links to description: ${videoLinks}`);
        }

        let postMessage;
        try {
            postMessage = await message.channel.send({ embeds: [embed] });
            await postMessage.react('❤️');
            await postMessage.react('👎');
            console.log(`[DEBUG] Post message sent: ${postMessage.id}`);
        } catch (err) {
            console.error(`[ERROR] Failed to send post: ${err.message}`);
            return message.reply('Error sending post. Check my permissions.');
        }

        const followers = await Follower.find({ followingId: message.author.id });
        for (const follower of followers) {
            try {
                const followerUser = await client.users.fetch(follower.followerId);
                await followerUser.send(
                    `${message.author.tag} just posted: ${content}${attachments.size > 0 ? ' (with attachments)' : ''
                    }\nCheck it out in ${message.channel}!`
                );
                console.log(`[DEBUG] Notified follower ${followerUser.tag}`);
            } catch (err) {
                console.log(`[WARNING] Could not DM follower ${follower.followerId}: ${err.message}`);
            }
        }

        message.reply('Your post has been created!');
    }

    // Set Profile Command
    if (command === 'setprofile') {
        const bio = args.join(' ') || 'No bio set.';
        let profile = await Profile.findOne({ userId: message.author.id });

        if (!profile) {
            profile = new Profile({
                userId: message.author.id,
                bio,
            });
        } else {
            profile.bio = bio;
        }

        await profile.save();
        message.reply('Profile updated!');
        console.log(`[DEBUG] Profile updated for ${message.author.tag}`);
    }

    // View Profile Command
    if (command === 'profile') {
        const target = message.mentions.users.first() || message.author;
        const profile = await Profile.findOne({ userId: target.id });

        if (!profile) {
            console.log(`[DEBUG] No profile found for ${target.tag}`);
            return message.reply('This user has no profile yet.');
        }

        const embed = new EmbedBuilder()
            .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() })
            .setDescription(`**Bio**: ${profile.bio}`)
            .addFields(
                { name: 'Followers', value: profile.followerCount.toString(), inline: true },
                { name: 'Following', value: profile.followingCount.toString(), inline: true }
            )
            .setColor('#0099ff');

        message.channel.send({ embeds: [embed] });
        console.log(`[DEBUG] Profile displayed for ${target.tag}`);
    }

    // Follow Command
    if (command === 'follow') {
        const target = message.mentions.users.first();
        if (!target) {
            console.log('[DEBUG] No target mentioned for follow');
            return message.reply('Please mention a user to follow!');
        }
        if (target.id === message.author.id) {
            console.log('[DEBUG] User tried to follow themselves');
            return message.reply('You cannot follow yourself!');
        }

        const existing = await Follower.findOne({
            followerId: message.author.id,
            followingId: target.id,
        });

        if (existing) {
            console.log(`[DEBUG] ${message.author.tag} already follows ${target.tag}`);
            return message.reply('You already follow this user!');
        }

        const follower = new Follower({
            followerId: message.author.id,
            followingId: target.id,
        });

        await follower.save();
        await Profile.findOneAndUpdate(
            { userId: target.id },
            { $inc: { followerCount: 1 } },
            { upsert: true, setDefaultsOnInsert: true }
        );
        await Profile.findOneAndUpdate(
            { userId: message.author.id },
            { $inc: { followingCount: 1 } },
            { upsert: true, setDefaultsOnInsert: true }
        );

        message.reply(`You are now following ${target.tag}!`);
        console.log(`[DEBUG] ${message.author.tag} followed ${target.tag}`);
    }

    // Search Hashtags Command
    if (command === 'search') {
        const tag = args[0]?.replace('#', '');
        if (!tag) {
            console.log('[DEBUG] No hashtag provided for search');
            return message.reply('Please provide a hashtag to search!');
        }

        const posts = await Post.find({ hashtags: tag }).limit(10);
        if (!posts.length) {
            console.log(`[DEBUG] No posts found for hashtag #${tag}`);
            return message.reply('No posts found with this hashtag.');
        }

        const embed = new EmbedBuilder()
            .setTitle(`Posts with #${tag}`)
            .setColor('#0099ff');

        for (const post of posts) {
            const tag = await getUserTag(post.userId);
            embed.addFields({ name: tag, value: post.content, inline: false });
        }

        message.channel.send({ embeds: [embed] });
        console.log(`[DEBUG] Search results displayed for #${tag}`);
    }

    // Feed Command (Your Followed Users, One Post per Page)
if (command === 'feed') {
    const followedUsers = await Follower.find({ followerId: message.author.id }).select('followingId');
    const totalPosts = await Post.countDocuments({ userId: { $in: followedUsers.map((f) => f.followingId) } });
    if (totalPosts === 0) {
        console.log(`[DEBUG] No feed posts for ${message.author.tag}`);
        return message.reply('No posts from followed users.');
    }

    let page = 0;
    async function sendFeedPage(pageNum) {
        const posts = await Post.find({ userId: { $in: followedUsers.map((f) => f.followingId) } })
            .sort({ createdAt: -1 })
            .skip(pageNum)
            .limit(1);

        const post = posts[0];
        const userTag = await getUserTag(post.userId);
        let description = post.content;

        const embed = new EmbedBuilder()
            .setTitle(`Your Feed (Post ${pageNum + 1}/${totalPosts})`)
            .setAuthor({ name: userTag, iconURL: (await client.users.fetch(post.userId)).displayAvatarURL() })
            .setDescription(description)
            .setColor('#0099ff')
            .setTimestamp(post.createdAt)
            .setFooter({ text: `Likes: ${post.likes} | Dislikes: ${post.dislikes} | Post ID: ${post._id}` });

        // Handle attachments
        if (post.attachments.length > 0) {
            const firstImage = post.attachments.find((url) =>
                ALLOWED_IMAGE_TYPES.some((type) => url.includes(type.split('/')[1]))
            );
            if (firstImage) {
                embed.setImage(firstImage);
                console.log(`[DEBUG] Added image to feed embed: ${firstImage}`);
            }
            const videoLinks = post.attachments
                .filter((url) => ALLOWED_VIDEO_TYPES.some((type) => url.includes(type.split('/')[1])))
                .map((url) => `[Video](${url})`)
                .join(', ');
            if (videoLinks) {
                description += `\n\n**Attachments**: ${videoLinks}`;
                embed.setDescription(description);
            }
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev_page')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pageNum === 0),
            new ButtonBuilder()
                .setCustomId('next_page')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pageNum === totalPosts - 1)
        );

        return { embed, row, post };
    }

    try {
        const { embed, row, post } = await sendFeedPage(page);
        const feedMessage = await message.channel.send({ embeds: [embed], components: [row] });
        await feedMessage.react('❤️');
        await feedMessage.react('👎');
        console.log(`[DEBUG] Feed displayed for ${message.author.tag}, post ${page + 1}/${totalPosts}`);

        const collector = feedMessage.createMessageComponentCollector({ time: 60000 });
        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: 'Only the command issuer can use these buttons!', ephemeral: true });
            }

            if (interaction.customId === 'prev_page' && page > 0) {
                page--;
            } else if (interaction.customId === 'next_page' && page < totalPosts - 1) {
                page++;
            }

            const { embed: updatedEmbed, row: updatedRow } = await sendFeedPage(page);
            await interaction.update({ embeds: [updatedEmbed], components: [updatedRow] });
            console.log(`[DEBUG] Updated feed to post ${page + 1}/${totalPosts} for ${message.author.tag}`);
        });

        collector.on('end', () => {
            feedMessage.edit({ components: [] });
            console.log(`[DEBUG] Feed collector ended for ${message.author.tag}`);
        });
    } catch (err) {
        console.error(`[ERROR] Failed to send feed: ${err.message}`);
        message.reply('Error displaying feed.');
    }
}

// User Feed Command (Specific User's Posts, One Post per Page)
if (command === 'userfeed') {
    const target = message.mentions.users.first();
    if (!target) {
        console.log('[DEBUG] No target mentioned for userfeed');
        return message.reply('Please mention a user to view their feed! (e.g., `;userfeed @friend`)');
    }

    const totalPosts = await Post.countDocuments({ userId: target.id });
    if (totalPosts === 0) {
        console.log(`[DEBUG] No posts found for user ${target.tag}`);
        return message.reply(`${target.tag} has no posts.`);
    }

    let page = 0;
    async function sendFeedPage(pageNum) {
        const posts = await Post.find({ userId: target.id })
            .sort({ createdAt: -1 })
            .skip(pageNum)
            .limit(1);

        const post = posts[0];
        let description = post.content;

        const embed = new EmbedBuilder()
            .setTitle(`${target.tag}'s Feed (Post ${pageNum + 1}/${totalPosts})`)
            .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() })
            .setDescription(description)
            .setColor('#0099ff')
            .setTimestamp(post.createdAt)
            .setFooter({ text: `Likes: ${post.likes} | Dislikes: ${post.dislikes} | Post ID: ${post._id}` });

        // Handle attachments
        if (post.attachments.length > 0) {
            const firstImage = post.attachments.find((url) =>
                ALLOWED_IMAGE_TYPES.some((type) => url.includes(type.split('/')[1]))
            );
            if (firstImage) {
                embed.setImage(firstImage);
                console.log(`[DEBUG] Added image to userfeed embed: ${firstImage}`);
            }
            const videoLinks = post.attachments
                .filter((url) => ALLOWED_VIDEO_TYPES.some((type) => url.includes(type.split('/')[1])))
                .map((url) => `[Video](${url})`)
                .join(', ');
            if (videoLinks) {
                description += `\n\n**Attachments**: ${videoLinks}`;
                embed.setDescription(description);
            }
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev_page')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pageNum === 0),
            new ButtonBuilder()
                .setCustomId('next_page')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pageNum === totalPosts - 1)
        );

        return { embed, row, post };
    }

    try {
        const { embed, row, post } = await sendFeedPage(page);
        const feedMessage = await message.channel.send({ embeds: [embed], components: [row] });
        await feedMessage.react('❤️');
        await feedMessage.react('👎');
        console.log(`[DEBUG] User feed displayed for ${target.tag} by ${message.author.tag}, post ${page + 1}/${totalPosts}`);

        const collector = feedMessage.createMessageComponentCollector({ time: 60000 });
        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: 'Only the command issuer can use these buttons!', ephemeral: true });
            }

            if (interaction.customId === 'prev_page' && page > 0) {
                page--;
            } else if (interaction.customId === 'next_page' && page < totalPosts - 1) {
                page++;
            }

            const { embed: updatedEmbed, row: updatedRow } = await sendFeedPage(page);
            await interaction.update({ embeds: [updatedEmbed], components: [updatedRow] });
            console.log(`[DEBUG] Updated user feed to post ${page + 1}/${totalPosts} for ${target.tag}`);
        });

        collector.on('end', () => {
            feedMessage.edit({ components: [] });
            console.log(`[DEBUG] User feed collector ended for ${target.tag}`);
        });
    } catch (err) {
        console.error(`[ERROR] Failed to send user feed: ${err.message}`);
        message.reply('Error displaying user feed.');
    }
}

    // User Post Command (Specific Post by Index)
    if (command === 'userpost') {
        const target = message.mentions.users.first();
        if (!target) {
            console.log('[DEBUG] No target mentioned for userpost');
            return message.reply('Please mention a user! (e.g., `;userpost @friend 3`)');
        }

        const index = parseInt(args[1], 10);
        if (isNaN(index) || index < 1) {
            console.log('[DEBUG] Invalid or missing post index for userpost');
            return message.reply('Please provide a valid post number! (e.g., `;userpost @friend 3`)');
        }

        const posts = await Post.find({ userId: target.id }).sort({ createdAt: -1 });
        if (posts.length === 0) {
            console.log(`[DEBUG] No posts found for user ${target.tag}`);
            return message.reply(`${target.tag} has no posts.`);
        }

        if (index > posts.length) {
            console.log(`[DEBUG] Post index ${index} out of range for ${target.tag}`);
            return message.reply(`${target.tag} only has ${posts.length} post(s).`);
        }

        const post = posts[index - 1];
        const embed = new EmbedBuilder()
            .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() })
            .setDescription(post.content)
            .setColor('#0099ff')
            .setTimestamp(post.createdAt)
            .setFooter({ text: `Post #${index} | Likes: ${post.likes} | Dislikes: ${post.dislikes} | Post ID: ${post._id}` });

        if (post.attachments.length > 0) {
            const firstImage = post.attachments.find((url) =>
                ALLOWED_IMAGE_TYPES.some((type) => url.includes(type.split('/')[1]))
            );
            if (firstImage) {
                embed.setImage(firstImage);
                console.log(`[DEBUG] Added image to userpost embed: ${firstImage}`);
            }
            const videoLinks = post.attachments
                .filter((url) => ALLOWED_VIDEO_TYPES.some((type) => url.includes(type.split('/')[1])))
                .map((url) => `[Video](${url})`)
                .join(', ');
            if (videoLinks) {
                embed.setDescription(`${post.content}\n\n**Attachments**: ${videoLinks}`);
            }
        }

        try {
            await message.channel.send({ embeds: [embed] });
            console.log(`[DEBUG] User post #${index} displayed for ${target.tag} by ${message.author.tag}`);
        } catch (err) {
            console.error(`[ERROR] Failed to send user post: ${err.message}`);
            return message.reply('Error displaying user post.');
        }
    }

    // Delete Profile Command
    // if (command === 'deleteprofile') {
    //     await Profile.deleteOne({ userId: message.author.id });
    //     await Post.deleteMany({ userId: message.author.id });
    //     await Follower.deleteMany({ $or: [{ followerId: message.author.id }, { followingId: message.author.id }] });
    //     message.reply('Your profile, posts, and follow data have been deleted.');
    //     console.log(`[DEBUG] Profile deleted for ${message.author.tag}`);
    // }
});

client.on('messageReactionAdd', async (reaction, user) => {
    console.log(`[DEBUG] Reaction ${reaction.emoji.name} by ${user.tag} on message ${reaction.message.id}`);

    if (user.bot || !['❤️', '👎'].includes(reaction.emoji.name)) return;

    const message = reaction.message;
    if (!message.embeds[0]) return;

    const postId = message.embeds[0].data.footer.text.match(/Post ID: (\w+)/)?.[1];
    if (!postId) {
        console.log('[DEBUG] No Post ID found in embed footer');
        return;
    }

    const post = await Post.findById(postId);
    if (!post) {
        console.log(`[DEBUG] Post ${postId} not found`);
        return;
    }

    if (user.id === post.userId) {
        await reaction.users.remove(user.id);
        console.log(`[DEBUG] Removed self-reaction by ${user.tag}`);
        return;
    }

    let updated = false;
    if (reaction.emoji.name === '❤️' && !post.likers.includes(user.id)) {
        post.likes += 1;
        post.likers.push(user.id);
        updated = true;
    } else if (reaction.emoji.name === '👎' && !post.dislikers.includes(user.id)) {
        post.dislikes += 1;
        post.dislikers.push(user.id);
        updated = true;
    }

    if (updated) {
        await post.save();
        const updatedEmbed = new EmbedBuilder()
            .setAuthor(message.embeds[0].author)
            .setDescription(message.embeds[0].description)
            .setColor(message.embeds[0].color)
            .setTimestamp(message.embeds[0].timestamp)
            .setFooter({ text: `Likes: ${post.likes} | Dislikes: ${post.dislikes} | Post ID: ${post._id}` });

        await message.edit({ embeds: [updatedEmbed] });

        try {
            const postAuthor = await client.users.fetch(post.userId);
            const action = reaction.emoji.name === '❤️' ? 'liked' : 'disliked';
            await postAuthor.send(`${user.tag} ${action} your post: ${post.content}`);
            console.log(`[DEBUG] Notified ${postAuthor.tag} of ${action} by ${user.tag}`);
        } catch (err) {
            console.log(`[WARNING] Could not DM author ${post.userId}: ${err.message}`);
        }
    }
});

client.on('error', (err) => {
    console.error('[ERROR] Client error:', err);
});

client.login(process.env.DISCORD_TOKEN).catch((err) => {
    console.error('[ERROR] Login failed:', err);
});