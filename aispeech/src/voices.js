/**
 * Gemini Speech Prebuilt Voices Catalog (30 Studio Voices)
 */

const VOICES = [
  { name: 'Puck', gender: 'Male', tone: 'Upbeat, energetic', description: 'Upbeat, articulate and energetic masculine voice' },
  { name: 'Charon', gender: 'Male', tone: 'Informative, deep', description: 'Informative, resonant and deeper male narrator' },
  { name: 'Kore', gender: 'Female', tone: 'Firm, professional', description: 'Default firm, clear and professional female voice' },
  { name: 'Aoede', gender: 'Female', tone: 'Breezy, natural', description: 'Breezy, natural and conversational female tone' },
  { name: 'Fenrir', gender: 'Male', tone: 'Excitable, dynamic', description: 'Excitable, dynamic and enthusiastic male voice' },
  { name: 'Leda', gender: 'Female', tone: 'Youthful, warm', description: 'Youthful, bright and warm feminine voice' },
  { name: 'Orus', gender: 'Male', tone: 'Firm, confident', description: 'Firm, grounded, confident male narrator' },
  { name: 'Zephyr', gender: 'Female', tone: 'Bright, cheerful', description: 'Bright, cheerful, clear feminine voice' },
  { name: 'Achernar', gender: 'Female', tone: 'Soft, gentle', description: 'Soft, gentle and soothing feminine voice' },
  { name: 'Achird', gender: 'Male', tone: 'Friendly, casual', description: 'Friendly, casual, approachable male speaker' },
  { name: 'Algenib', gender: 'Male', tone: 'Gravelly, textured', description: 'Gravelly, mature, textured masculine voice' },
  { name: 'Algieba', gender: 'Male', tone: 'Smooth, polished', description: 'Smooth, polished and refined male delivery' },
  { name: 'Alnilam', gender: 'Male', tone: 'Firm, authoritative', description: 'Firm, authoritative, steady male tone' },
  { name: 'Autonoe', gender: 'Female', tone: 'Bright, articulate', description: 'Bright, articulate, expressive feminine voice' },
  { name: 'Callirrhoe', gender: 'Female', tone: 'Easy-going, relaxed', description: 'Easy-going, relaxed, natural conversationalist' },
  { name: 'Despina', gender: 'Female', tone: 'Smooth, warm', description: 'Smooth, warm, melodic feminine voice' },
  { name: 'Enceladus', gender: 'Male', tone: 'Breathy, subtle', description: 'Breathy, subtle, intimate masculine tone' },
  { name: 'Erinome', gender: 'Female', tone: 'Clear, crisp', description: 'Clear, crisp, analytical feminine speaker' },
  { name: 'Gacrux', gender: 'Male', tone: 'Mature, seasoned', description: 'Mature, seasoned, experienced male storyteller' },
  { name: 'Iapetus', gender: 'Male', tone: 'Clear, resonant', description: 'Clear, resonant, classic male presenter' },
  { name: 'Laomedeia', gender: 'Female', tone: 'Upbeat, lively', description: 'Upbeat, lively, modern female presenter' },
  { name: 'Pulcherrima', gender: 'Neutral', tone: 'Forward, direct', description: 'Forward, direct, expressive persona' },
  { name: 'Rasalgethi', gender: 'Male', tone: 'Informative, neutral', description: 'Informative, neutral documentary style' },
  { name: 'Sadachbia', gender: 'Neutral', tone: 'Lively, spirited', description: 'Lively, spirited, engaging voice' },
  { name: 'Sadaltager', gender: 'Neutral', tone: 'Knowledgeable, calm', description: 'Knowledgeable, calm, instructional narrator' },
  { name: 'Schedar', gender: 'Male', tone: 'Even, steady', description: 'Even, steady, measured male delivery' },
  { name: 'Sulafat', gender: 'Neutral', tone: 'Warm, comforting', description: 'Warm, comforting, welcoming delivery' },
  { name: 'Umbriel', gender: 'Male', tone: 'Easy-going, calm', description: 'Easy-going, calm, laid-back male speaker' },
  { name: 'Vindemiatrix', gender: 'Female', tone: 'Gentle, melodious', description: 'Gentle, melodious, thoughtful female voice' },
  { name: 'Zubenelgenubi', gender: 'Neutral', tone: 'Casual, conversational', description: 'Casual, conversational, natural everyday voice' }
];

function listVoices(filter = {}) {
  let list = [...VOICES];
  if (filter.gender) {
    list = list.filter(v => v.gender.toLowerCase() === filter.gender.toLowerCase());
  }
  if (filter.query) {
    const q = filter.query.toLowerCase();
    list = list.filter(v => 
      v.name.toLowerCase().includes(q) || 
      v.tone.toLowerCase().includes(q) || 
      v.description.toLowerCase().includes(q)
    );
  }
  return list;
}

function findVoice(nameOrQuery) {
  if (!nameOrQuery) return null;
  const target = nameOrQuery.trim().toLowerCase();
  // Exact match first
  const exact = VOICES.find(v => v.name.toLowerCase() === target);
  if (exact) return exact;
  // Partial match
  return VOICES.find(v => v.name.toLowerCase().includes(target)) || null;
}

module.exports = {
  VOICES,
  listVoices,
  findVoice
};
