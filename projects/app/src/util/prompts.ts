export function buildPronunciationHintPrompt({
  leadCharacter,
  location,
  cue,
  creativeDirection,
  count,
}: {
  leadCharacter: { name: string; bio?: string; article?: string };
  location: { name: string; description?: string };
  cue: { word: string; meaning?: string };
  creativeDirection?: string;
  count: number;
}): { system: string; user: string } {
  const system = [
    `You create short pronunciation mnemonic story ideas for Mandarin learners.`,
    `Invent vivid, memorable mini-scenes using a character, a location, and a keyword.`,
    `The goal is to create a scene that is easy to picture and easy to remember.`,
    `Each scene should feel like a tiny absurd sketch or striking mental snapshot.`,
    `Always clearly include the named character and location.`,
    `When a character article is provided (e.g. "the", "a"), always refer to the character with that article (e.g. "the seal") rather than as a bare proper noun.`,
    `Use the keyword as light inspiration for what happens, but do not turn the result into a definition.`,
    `When cue meaning context is provided, treat it as authoritative and use that intended sense of the cue word.`,
    `When creative direction is provided, treat it as soft guidance for tone and style while still prioritizing mnemonic clarity.`,
    `When the cue word (or a close form of it) appears in the story text, wrap it in ==word== markup (e.g. ==can== or ==canning==).`,
    `If extra character or location details are provided, use them to make the story more specific.`,
    `Keep each hint to 1-2 sentences.`,
    `Prefer visual, unusual, and memorable situations over generic ones.`,
  ].join(`\n`);

  const characterRef =
    leadCharacter.article == null || leadCharacter.article.trim() === ``
      ? leadCharacter.name
      : `${leadCharacter.article} ${leadCharacter.name}`;

  const optionalLines = [
    leadCharacter.bio == null
      ? null
      : `Lead character bio: ${leadCharacter.bio}`,
    location.description == null
      ? null
      : `Location description: ${location.description}`,
    cue.meaning == null ? null : `Cue meaning: ${cue.meaning}`,
    creativeDirection == null
      ? null
      : `Creative direction: ${creativeDirection}`,
  ].filter((line): line is string => line != null);

  const user = [
    `Story ingredients:`,
    `- Lead character: ${characterRef}`,
    `- Location: ${location.name}`,
    `- Cue: ${cue.word}`,
    ...(optionalLines.length > 0 ? [``, ...optionalLines] : []),
    ``,
    `Generate ${count} distinct mnemonic story ideas.`,
    `Each suggestion must explicitly include the character and location by name.`,
    `Use the keyword as light inspiration for the central action, object, or conflict.`,
    `If cue meaning is provided, follow that exact sense instead of other possible meanings of the same word.`,
    `Good suggestions are specific, visual, unusual, and easy to replay mentally.`,
    `Bad suggestions are generic, flat, or mostly just a definition.`,
    `Format: wrap the cue word (or its inflected form) in ==word== whenever it appears in the story text.`,
  ].join(`\n`);

  return { system, user };
}

export function buildMeaningHintPrompt({
  hanzi,
  meaning,
  components,
  count,
}: {
  hanzi: string;
  meaning: { hanziWord: string; glosses: string[] };
  components?: {
    hanzi?: string;
    label?: string;
    meaning?: string;
  }[];
  count: number;
}): { system: string; user: string } {
  const system = [
    `You create short meaning-recognition mnemonic hints for Mandarin learners.`,
    `Your job is to help the learner remember what a Hanzi means using its visual components.`,
    `Use the provided component details as the core building blocks of each hint.`,
    `Write vivid, concrete, and memorable mini-scenes or mental images.`,
    `Focus on meaning recall, not pronunciation.`,
    `Avoid historical or etymological claims unless directly supported by the provided component context.`,
    `Keep each hint to 1-2 sentences.`,
    `Prefer unusual but clear imagery over generic definitions.`,
  ].join(`\n`);

  const primaryGloss = meaning.glosses[0] ?? ``;
  const extraGlosses = meaning.glosses.slice(1);
  const formattedComponents = (components ?? []).map((component, index) => {
    const parts = [
      component.hanzi == null ? null : `hanzi: ${component.hanzi}`,
      component.label == null ? null : `label: ${component.label}`,
      component.meaning == null ? null : `meaning: ${component.meaning}`,
    ].filter((part): part is string => part != null);

    return `- Component ${index + 1}: ${parts.join(` | `)}`;
  });

  const user = [
    `Character: ${hanzi}`,
    `Primary gloss: ${primaryGloss}`,
    ...(extraGlosses.length === 0
      ? []
      : [`Additional glosses: ${extraGlosses.join(`; `)}`]),
    ...(formattedComponents.length === 0
      ? []
      : [``, `Component context:`, ...formattedComponents]),
    ``,
    `Generate ${count} distinct mnemonic hints.`,
    `Each suggestion should help a learner recall the target meaning from the character's components.`,
    `Do not write a plain dictionary definition.`,
    `Do not introduce pronunciation guidance.`,
    `If component context is provided, ground the hint in those components explicitly.`,
  ].join(`\n`);

  return { system, user };
}

export function buildSubLocationDescriptionPrompt({
  label,
  location,
  locationNotes,
  sublocation,
  viewpoint,
  count,
}: {
  label: string;
  location: string;
  locationNotes?: string;
  sublocation: string;
  viewpoint?: string;
  count: number;
}): { system: string; user: string } {
  const system = [
    `You create reusable location descriptions for Mandarin pronunciation mnemonic scenes.`,
    `Your goal is to define a stable mental image of a place that can be reused across many stories.`,
    `You will be given a primary location and a sublocation within or around it. Combine them into one clear, vivid, always-true mental setting.`,
    `Focus on persistent features such as layout, materials, signage, objects, textures, lighting style, and ambient sensory details.`,
    `Avoid time-specific or temporary details such as time of day, weather, ongoing events, or people doing actions.`,
    `Keep each description to 1-2 sentences. Make them specific, visual, and easy to remember.`,
  ].join(`\n`);

  const optionalLines = [
    locationNotes == null ? null : `Location notes: ${locationNotes}`,
    viewpoint == null ? null : `Viewpoint: ${viewpoint}`,
  ].filter((line): line is string => line != null);

  const user = [
    `Location: ${location}`,
    `Sublocation: ${sublocation}`,
    ...(optionalLines.length > 0 ? [``] : []),
    ...optionalLines,
    ``,
    `Generate ${count} distinct reusable location descriptions for this exact combined place: ${label}`,
    ``,
    `Each suggestion must:`,
    `- Clearly reflect both the Location and the Sublocation`,
    `- If a Viewpoint is provided, ensure the description matches that perspective`,
    `- Describe stable, always-true aspects of the place`,
    `- Return only the descriptive fragment itself, don't prefix with the place label`,
    `- Avoid time of day, weather, or temporary events`,
    `- Avoid actions or specific story moments`,
    `- Be easy to visualize and reuse in different mnemonic scenes`,
    ``,
    `Good suggestions feel like a reusable mental stage.`,
    `Bad suggestions feel like a one-time scene.`,
  ].join(`\n`);

  return { system, user };
}

export function buildLeadCharacterDescriptionPrompt({
  name,
  sound,
  existingDescription,
  count,
}: {
  name: string;
  sound: string;
  existingDescription?: string;
  count: number;
}): { system: string; user: string } {
  const system = [
    `You create vivid, distinct character personalities for Mandarin pronunciation mnemonic palaces.`,
    `Your goal is to define a memorable character with a unique trait, backstory, or personality that makes them unforgettable.`,
    `Each character bio should feel distinct, specific, and reusable across many mnemonic stories.`,
    `Focus on personality quirks, memorable traits, backstory hints, or distinctive mannerisms.`,
    `Make characters feel like real people with depth—avoid generic or flat descriptions.`,
    `Keep each bio to 1-2 sentences. Make them specific, visual, and easy to remember.`,
  ].join(`\n`);

  const optionalLines = [
    existingDescription == null
      ? null
      : `Existing description: ${existingDescription}`,
  ].filter((line): line is string => line != null);

  const user = [
    `Character: ${name}`,
    `Associated pinyin sound: ${sound}`,
    ...(optionalLines.length > 0 ? [``] : []),
    ...optionalLines,
    ``,
    `Generate ${count} distinct character personality descriptions for this character.`,
    ``,
    `Each suggestion must:`,
    `- Describe a unique, memorable personality or trait`,
    `- Feel like a real person with specific quirks or depth`,
    `- Be distinct from other suggestions`,
    `- Return only the descriptive fragment itself, don't prefix with the character name`,
    `- Be easy to visualize and reuse in different mnemonic stories`,
    `- NOT be a definition or encyclopedia-style description`,
    ``,
    `Good suggestions feel like a vivid character profile.`,
    `Bad suggestions feel generic, flat, or encyclopedia-like.`,
  ].join(`\n`);

  return { system, user };
}
