interface Phrase {
  id: string;
  text: string;
}

interface Voice {
  id: string;
  name: string;
}

export const phrases: readonly Phrase[] = [
  { id: "1", text: "我最喜欢果汁" },
  { id: "2", text: "您想用现金还是支付宝支付？" },
  { id: "3", text: "上" },
];

export const voices: readonly Voice[] = [
  { id: "1", name: "Han (Premium)" },
  { id: "2", name: "Lilian (Premium)" },
];
