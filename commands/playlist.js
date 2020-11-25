const {
	Util,
	MessageEmbed
} = require("discord.js");
const ytdl = require("ytdl-core");
const yts = require("yt-search");
const youtube = require("youtube-sr");
const sendError = require("../util/error")

module.exports = {
	info: {
		name: "playlist",
		description: "To play songs :D",
		usage: "<YouTube Playlist URL | Playlist Name>",
		aliases: ["pl"],
	},

	run: async function (client, message, args) {
		const channel = message.member.voice.channel;
		if (!channel) return sendError("I'm sorry but you need to be in a voice channel to play music!", message.channel);
		const url = args[0] ? args[0].replace(/<(.+)>/g, "$1") : "";
		var searchString = args.join(" ");
		const permissions = channel.permissionsFor(message.client.user);
		if (!permissions.has("CONNECT")) return sendError("I cannot connect to your voice channel, make sure I have the proper permissions!", message.channel);
		if (!permissions.has("SPEAK")) return sendError("I cannot speak in this voice channel, make sure I have the proper permissions!", message.channel);

		if (!url) return sendError(`Usage: ${message.client.config.prefix}playlist <YouTube Playlist URL | Playlist Name>`, message.channel);
		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			try {
				const playlist = await youtube.getPlaylist(url);
				if (playlist === null) return sendError("Playlist not found", message.channel)
				const videos = await playlist.videos;
				for (const video of videos) {
					// eslint-disable-line no-await-in-loop
					await handleVideo(video, message, channel, true); // eslint-disable-line no-await-in-loop
				}
				return message.channel.send({
					embed: {
						color: "GREEN",
						description: `✅  **|**  Playlist: **\`${playlist.title}\`** has been added to the queue`
					}
				})
			} catch (error) {
				console.error(error);
				return message.reply("Playlist not found :(").catch(console.error);
			}
		} else {
			try {
				var searched = await yts.search(searchString)

				if (searched.playlists.length === 0) return sendError("Looks like i was unable to find the playlist on YouTube", message.channel)
				var songInfo = searched.playlists[0]
				let listurl = songInfo.url;
				const playlist = await youtube.getPlaylist(listurl);
				const videos = await playlist.videos;
				for (const video of videos) {
					// eslint-disable-line no-await-in-loop
					await handleVideo(video, message, channel, true); // eslint-disable-line no-await-in-loop
				}
				let thing = new MessageEmbed()
					.setAuthor("Playlist has been added to queue", "https://raw.githubusercontent.com/SudhanPlayz/Discord-MusicBot/master/assets/Music.gif")
					.setThumbnail(playlist.thumbnail.url)
					.setColor("GREEN")
					.setDescription(`✅  **|**  Playlist: **\`${playlist.title}\`** has been added to the queue`)
				return message.channel.send(thing)
			} catch (error) {
				console.error(error);
				return message.reply(error.message).catch(console.error);
			}
		}

		async function handleVideo(video, message, channel, playlist = false) {
			const serverQueue = message.client.queue.get(message.guild.id);
			const song = {
				id: video.id,
				title: Util.escapeMarkdown(video.title),
				views: String(video.views).padStart(10, ' '),
				ago: video.ago ? video.ago : "Playlist",
				duration: video.durationFormatted,
				url: `https://www.youtube.com/watch?v=${video.id}`,
				img: video.thumbnail.url,
				req: message.author
			};
			if (!serverQueue) {
				const queueConstruct = {
					textChannel: message.channel,
					voiceChannel: channel,
					connection: null,
					songs: [],
					volume: 2,
					playing: true,
					loop: false
				};
				message.client.queue.set(message.guild.id, queueConstruct);
				queueConstruct.songs.push(song);

				try {
					var connection = await channel.join();
					queueConstruct.connection = connection;
					play(message.guild, queueConstruct.songs[0]);
				} catch (error) {
					console.error(`I could not join the voice channel: ${error}`);
					message.client.queue.delete(message.guild.id);
					return sendError(`I could not join the voice channel: ${error}`, message.channel);

				}
			} else {
				serverQueue.songs.push(song);
				if (playlist) return;
				let thing = new MessageEmbed()
					.setAuthor("Song has been added to queue", "https://raw.githubusercontent.com/SudhanPlayz/Discord-MusicBot/master/assets/Music.gif")
					.setThumbnail(song.img)
					.setColor("YELLOW")
					.addField("Name", song.title, true)
					.addField("Duration", song.duration, true)
					.addField("Requested by", song.req.tag, true)
					.setFooter(`Views: ${song.views} | ${song.ago}`)
				return message.channel.send(thing);
			}
			return;
		}

		function play(guild, song) {
			const serverQueue = message.client.queue.get(message.guild.id);

			if (!song) {
				serverQueue.voiceChannel.leave();
				return message.client.queue.delete(message.guild.id);

			}

			const dispatcher = serverQueue.connection.play(ytdl(song.url))
				.on("finish", () => {
					const shiffed = serverQueue.songs.shift();
					if (serverQueue.loop === true) {
						serverQueue.songs.push(shiffed);
					};
					play(guild, serverQueue.songs[0]);
				})
				.on("error", error => console.error(error));
			dispatcher.setVolume(serverQueue.volume / 5);
			let thing = new MessageEmbed()
				.setAuthor("Started Playing Music!", "https://raw.githubusercontent.com/SudhanPlayz/Discord-MusicBot/master/assets/Music.gif")
				.setThumbnail(song.img)
				.setColor("BLUE")
				.addField("Name", song.title, true)
				.addField("Duration", song.duration, true)
				.addField("Requested by", song.req.tag, true)
				.setFooter(`Views: ${song.views} | ${song.ago}`)
			serverQueue.textChannel.send(thing);
		}

	}

};
