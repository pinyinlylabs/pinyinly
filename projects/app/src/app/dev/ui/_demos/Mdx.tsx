import type { PropsWithChildren } from "react";
import { Children, createContext, use } from "react";
import { Text, View } from "react-native";
import Demo from "./_mdx/demo.mdx";

export default () => {
  return (
    <View>
      <Text>Hello demos</Text>

      <Context.Provider value={{ i: 0 }}>
        <Demo
          components={{
            p: Span,
            b: ({ children }: PropsWithChildren) => (
              <Text className="font-bold">
                <Span>{children}</Span>
              </Text>
            ),
            strong: ({ children }: PropsWithChildren) => (
              <Text className="font-bold">
                <Span>{children}</Span>
              </Text>
            ),
            em: ({ children }: PropsWithChildren) => (
              <Text className="italic">
                <Span>{children}</Span>
              </Text>
            ),
          }}
        />
      </Context.Provider>
    </View>
  );
};

const Context = createContext({ i: 0 });

const Span = ({ children }: PropsWithChildren) => {
  return Children.map(children, (child, index) =>
    typeof child === `string` ? (
      <CounterText key={index}>{child}</CounterText>
    ) : (
      child
    ),
  );
};

const CounterText = ({ children }: { children: string }) => {
  console.log(`children=`, children);
  const ctx = use(Context);

  return children.split(``).map((char, i) => (
    <Text key={i}>
      {char}
      {ctx.i++}
    </Text>
  ));
};
