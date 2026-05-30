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
}

interface iTunesResult {
	artistName: string;
	collectionName: string;
	trackName: string;
	artworkUrl100: string;
	trackViewUrl: string;
	previewUrl?: string;
}

function dedupByArtist<T extends { title?: string; title_short?: string; artist?: { name: string } | string }>(
	results: T[],
	targetTitle: string,
): T[] {
	const cleanTarget = targetTitle.toLowerCase().trim();
	const seen = new Map<string, T>();

	for (const r of results) {
		const title = (r.title ?? r.title_short ?? '').toLowerCase();
		const artist = typeof (r as any).artist === 'string' ? (r as any).artist : (r as any).artist?.name;

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

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${s.toString().padStart(2, '0')}`;
}

export default {
	data: new SlashCommandBuilder()
		.setName('findsong')
		.setDescription('Search for a song and get listening links across platforms')
		.addStringOption(option =>
			option.setName('query')
				.setDescription('Song title, artist, or lyrics (e.g. "Bones for the Crows by Nickelback")')
				.setRequired(true)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const query = interaction.options.getString('query')!.trim();

		if (query.length < 2) {
			await interaction.reply({
				content: 'Please provide a valid search query (at least 2 characters).',
				ephemeral: true,
			});
			return;
		}

		await interaction.deferReply();

		let deezerResults: DeezerTrack[] = [];
		let itunesResults: iTunesResult[] = [];

		try {
			const [deezerRes, itunesRes] = await Promise.all([
				axios.get('https://api.deezer.com/search', {
					params: { q: query, limit: 10 },
				}),
				axios.get('https://itunes.apple.com/search', {
					params: { term: query, limit: 10, media: 'music' },
				}),
			]);

			deezerResults = (deezerRes.data.data ?? []).filter((t: DeezerTrack) => t.title);
			itunesResults = itunesRes.data.results ?? [];
		} catch (error) {
			console.error('Error searching for tracks:', error);
		}

		// Dedup: one result per artist, unless it's the target song (different artists can have same song)
		deezerResults = dedupByArtist(deezerResults, query);
		itunesResults = dedupByArtist(itunesResults, query);

		if (deezerResults.length === 0 && itunesResults.length === 0) {
			await interaction.editReply({
				content: `😕 No results found for "${query}". Try a different search term.`,
			});
			return;
		}

		// Show top results (after dedup)
		const topResults = deezerResults.slice(0, 5);

		// Build platform links for the top result
		const bestDeezer = topResults[0];
		const bestiTunes = itunesResults[0];

		const platforms: { name: string; emoji: string; url: string }[] = [];

		// Spotify (search link)
		platforms.push({
			name: 'Spotify',
			emoji: '🟢',
			url: `https://open.spotify.com/search/${encodeURIComponent(query)}`,
		});

		// Apple Music
		if (bestiTunes) {
			platforms.push({ name: 'Apple Music', emoji: '🍎', url: bestiTunes.trackViewUrl });
		} else {
			platforms.push({ name: 'Apple Music', emoji: '🍎', url: `https://music.apple.com/search?term=${encodeURIComponent(query)}` });
		}

		// Deezer
		if (bestDeezer) {
			platforms.push({ name: 'Deezer', emoji: '💿', url: bestDeezer.link });
		} else {
			platforms.push({ name: 'Deezer', emoji: '💿', url: `https://www.deezer.com/search/${encodeURIComponent(query)}` });
		}

		// YouTube
		platforms.push({
			name: 'YouTube',
			emoji: '🔴',
			url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
		});

		// YouTube Music
		platforms.push({
			name: 'YT Music',
			emoji: '🎵',
			url: `https://music.youtube.com/search?q=${encodeURIComponent(query)}`,
		});

		// Build embed with top results
		const embed = new EmbedBuilder()
			.setTitle(`🔍 Search Results for "${query}"`)
			.setColor(0x5865F2);

		// Add Deezer results as fields
		if (topResults.length > 0) {
			const fields = topResults.map((t, i) => ({
				name: `${i + 1}. ${t.title}`,
				value: `🎤 ${t.artist.name} · 💿 ${t.album?.title ?? 'Unknown'} · ⏱ ${formatDuration(t.duration)}`,
				inline: false,
			}));
			embed.addFields(fields);
		}

		// Add iTunes results if different from Deezer
		if (bestiTunes && !topResults.find(t => t.title === bestiTunes.trackName && t.artist.name === bestiTunes.artistName)) {
			embed.addFields({
				name: `Extra Result`,
				value: `🍎 ${bestiTunes.trackName} — ${bestiTunes.artistName} from *${bestiTunes.collectionName}*`,
				inline: false,
			});
		}

		embed.setFooter({ text: 'Click buttons to open on different platforms' });

		// Build buttons
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
