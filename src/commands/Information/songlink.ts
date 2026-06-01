import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from 'discord.js';
import axios from 'axios';

interface DeezerTrack {
	id: number;
	title: string;
	title_short: string;
	artist: { id: number; name: string; link: string };
	album: { id: number; title: string; cover: string; cover_xl: string };
	link: string;
	duration: number;
	isrc?: string;
}

interface iTunesResult {
	artistName: string;
	collectionName: string;
	trackName: string;
	artworkUrl100: string;
	trackViewUrl: string;
	previewUrl?: string;
}

function extractSpotifyId(url: string): string | null {
	const match = url.match(/spotify(?:\.com)\/track\/([a-zA-Z0-9]+)/);
	return match?.[1] ?? null;
}

function extractYouTubeMusicId(url: string): string | null {
	const match = url.match(/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
	return match?.[1] ?? null;
}

function isSpotifyUrl(url: string): boolean {
	return /spotify\.com\/(track|album|playlist|artist|episode|show)\//.test(url);
}

function isYouTubeMusicUrl(url: string): boolean {
	return /music\.youtube\.com\/watch\?v=/.test(url);
}

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${s.toString().padStart(2, '0')}`;
}

function dedupByArtist<T extends { title?: string; title_short?: string; artist?: { name: string } }>(
	results: T[],
	targetTitle: string,
): T[] {
	const cleanTarget = targetTitle.toLowerCase().trim();
	const seen = new Map<string, T>();

	for (const r of results) {
		const title = (r.title ?? r.title_short ?? '').toLowerCase();
		const artist = (r as any).artist?.name;

		// If this is the target song (exact title match), keep it regardless of artist
		if (title === cleanTarget) {
			seen.set(artist, r);
			continue;
		}

		// For non-target songs, dedup by artist — keep first occurrence per artist
		if (!seen.has(artist)) {
			seen.set(artist, r);
		}
	}

	return Array.from(seen.values());
}

function bestMatch<T extends { title?: string; title_short?: string }>(
	results: T[],
	title: string,
	artist?: string
): T | undefined {
	const cleanTitle = title.toLowerCase().trim();
	if (artist) {
		const cleanArtist = artist.toLowerCase().trim();
		const exact = results.find(
			r =>
				(r.title ?? r.title_short ?? '').toLowerCase() === cleanTitle &&
				(r as any).artist?.name?.toLowerCase() === cleanArtist
		);
		if (exact) return exact;
	}
	return results.find(r => (r.title ?? r.title_short ?? '').toLowerCase() === cleanTitle);
}

export default {
	data: new SlashCommandBuilder()
		.setName('songlink')
		.setDescription('Convert a Spotify or YouTube Music link to links on other platforms')
		.addStringOption(option =>
			option.setName('url')
				.setDescription('A Spotify track URL or YouTube Music URL')
				.setRequired(true)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const url = interaction.options.getString('url')!.trim();

		if (!isSpotifyUrl(url) && !isYouTubeMusicUrl(url)) {
			await interaction.reply({
				content: 'Please provide a valid Spotify track URL or YouTube Music URL.',
				ephemeral: true,
			});
			return;
		}

		await interaction.deferReply();

		let trackInfo: { title: string; artist: string; thumbnail?: string } = {
			title: '',
			artist: '',
		};

		// Extract exact info from the source URL
		try {
			if (isSpotifyUrl(url)) {
				const spotifyId = extractSpotifyId(url);
				if (!spotifyId) throw new Error('Could not extract Spotify track ID');

				const { data: oembed } = await axios.get(
					`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${spotifyId}`
				);
				trackInfo.title = oembed.title;
				trackInfo.artist = oembed.author_name;
				trackInfo.thumbnail = oembed.thumbnail_url;
			} else if (isYouTubeMusicUrl(url)) {
				const ytId = extractYouTubeMusicId(url);
				if (!ytId) throw new Error('Could not extract YouTube Music video ID');

				// YouTube oembed works for regular YouTube
				try {
					const { data: oembed } = await axios.get(
						`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`
					);
					trackInfo.title = oembed.title;
					trackInfo.artist = oembed.author_name;
					trackInfo.thumbnail = oembed.thumbnail_url;
				} catch {
					// If oembed fails, we'll search by the URL itself
					trackInfo.title = 'Unknown Track';
					trackInfo.artist = 'Unknown Artist';
				}
			}
		} catch (error) {
			console.error('Error extracting track info:', error);
		}

		// Search Deezer and iTunes for matching tracks
		let deezerResults: DeezerTrack[] = [];
		let itunesResults: iTunesResult[] = [];

		try {
			const [deezerRes, itunesRes] = await Promise.all([
				axios.get('https://api.deezer.com/search', {
					params: { q: `${trackInfo.title} ${trackInfo.artist}`, limit: 10 },
				}),
				axios.get('https://itunes.apple.com/search', {
					params: { term: `${trackInfo.title} ${trackInfo.artist}`, limit: 10, media: 'music' },
				}),
			]);

			deezerResults = (deezerRes.data.data ?? []).filter((t: DeezerTrack) => t.title);
			itunesResults = itunesRes.data.results ?? [];
		} catch (error) {
			console.error('Error searching for tracks:', error);
		}

		// Dedup: one result per artist, unless it's the target song (different artists can have same song)
		deezerResults = dedupByArtist(deezerResults, trackInfo.title);
		itunesResults = dedupByArtist(itunesResults, trackInfo.title);

		// Find best match using exact title + artist matching
		const bestDeezer = bestMatch(deezerResults, trackInfo.title, trackInfo.artist);
		const bestiTunes = bestMatch(itunesResults, trackInfo.title, trackInfo.artist);

		// Build platform info with link type indicators
		type PlatformInfo = {
			name: string;
			emoji: string;
			url: string;
			exact: boolean; // true = direct deep link, false = search
		};

		const platforms: PlatformInfo[] = [];

		// Spotify — exact if source is Spotify, otherwise search
		if (isSpotifyUrl(url)) {
			platforms.push({ name: 'Spotify', emoji: '🟢', url, exact: true });
		} else {
			platforms.push({
				name: 'Spotify',
				emoji: '🟢',
				url: `https://open.spotify.com/search/${encodeURIComponent(trackInfo.title + ' ' + trackInfo.artist)}`,
				exact: false,
			});
		}

		// Apple Music — direct deep link if matched, otherwise search
		if (bestiTunes) {
			platforms.push({ name: 'Apple Music', emoji: '🍎', url: bestiTunes.trackViewUrl, exact: true });
		} else {
			platforms.push({
				name: 'Apple Music',
				emoji: '🍎',
				url: `https://music.apple.com/search?term=${encodeURIComponent(trackInfo.title + ' ' + trackInfo.artist)}`,
				exact: false,
			});
		}

		// Deezer — direct deep link if matched, otherwise search
		if (bestDeezer) {
			platforms.push({ name: 'Deezer', emoji: '💿', url: bestDeezer.link, exact: true });
		} else {
			platforms.push({
				name: 'Deezer',
				emoji: '💿',
				url: `https://www.deezer.com/search/${encodeURIComponent(trackInfo.title + ' ' + trackInfo.artist)}`,
				exact: false,
			});
		}

		// YouTube — always search
		platforms.push({
			name: 'YouTube',
			emoji: '🔴',
			url: `https://www.youtube.com/results?search_query=${encodeURIComponent(trackInfo.title + ' ' + trackInfo.artist)}`,
			exact: false,
		});

		// YouTube Music — exact if source is YT Music, otherwise search
		if (isYouTubeMusicUrl(url)) {
			platforms.push({ name: 'YouTube Music', emoji: '🎵', url, exact: true });
		} else {
			platforms.push({
				name: 'YouTube Music',
				emoji: '🎵',
				url: `https://music.youtube.com/search?q=${encodeURIComponent(trackInfo.title + ' ' + trackInfo.artist)}`,
				exact: false,
			});
		}

		// Build embed
		const embed = new EmbedBuilder()
			.setTitle(`🎶 ${trackInfo.title}`)
			.setDescription(`**${trackInfo.artist}**`)
			.setThumbnail(trackInfo.thumbnail || undefined)
			.setFooter({ text: '🔗 = direct link  |  🔍 = search' })
			.setColor(0x5865F2);

		if (bestDeezer) {
			embed.addFields(
				{ name: 'Duration', value: formatDuration(bestDeezer.duration), inline: true },
				{ name: 'Album', value: bestDeezer.album?.title || 'N/A', inline: true }
			);
		}

		// Build buttons (Discord limits to 5 per row)
		const row1 = new ActionRowBuilder<ButtonBuilder>();
		const row2 = new ActionRowBuilder<ButtonBuilder>();

		platforms.forEach((p, i) => {
			const btn = new ButtonBuilder()
				.setLabel(p.name)
				.setEmoji(p.emoji)
				.setURL(p.url)
				.setStyle(ButtonStyle.Link);

			if (i < 5) {
				row1.addComponents(btn);
			} else {
				row2.addComponents(btn);
			}
		});

		const components = [row1];
		if (row2.components.length > 0) components.push(row2);

		await interaction.editReply({ embeds: [embed], components });
	},
};
