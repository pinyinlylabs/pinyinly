/* eslint-disable @haohaohow/no-restricted-css-classes */
import { RectButton } from "@/client/ui/RectButton";
import { useWebsiteStore } from "@/client/website";
import { invariant } from "@haohaohow/lib/invariant";
import { Image } from "expo-image";
import { Link, Slot } from "expo-router";
import { ScrollView, View } from "react-native";
import Reanimated, { FadeIn, FadeOut } from "react-native-reanimated";
import { tv } from "tailwind-variants";
import { useIntersectionObserver } from "usehooks-ts";

export default function WebsiteLayout() {
  const isBodyGetStartedVisible = useWebsiteStore(
    (s) => s.isBodyGetStartedVisible,
  );

  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 0.5,
    initialIsIntersecting: true,
  });

  const calligraphy = require(`@/assets/www/calligraphy.png`) as {
    uri?: string;
  };
  invariant(calligraphy.uri != null, `Expected calligraphy.uri to be a URI`);

  return (
    <>
      <header
        className={`
          www-px-comfortable fixed inset-x-0 top-0 z-50 flex h-[72px] justify-center border-0 bg-bg
          transition-all

          ${isIntersecting ? `` : `border-b-2 border-solid border-bg-1`}
        `}
      >
        <View className="flex w-full max-w-www-col justify-between">
          <View
            className={`
              size-full flex-row justify-center

              md:justify-start
            `}
          >
            <Image
              source={require(`@/assets/logo/logo-row.svg`)}
              className="h-[40px] w-[200px] shrink self-center text-fg"
              tintColor="currentColor"
              contentFit="fill"
            />

            {isBodyGetStartedVisible ? null : (
              <View className="flex-1 flex-row items-center justify-end gap-2">
                <Reanimated.View
                  entering={FadeIn.duration(100)}
                  exiting={FadeOut.duration(100)}
                >
                  <Link href="/learn" asChild>
                    <RectButton variant="filled" className="theme-accent">
                      Get Started
                    </RectButton>
                  </Link>
                </Reanimated.View>
              </View>
            )}
          </View>
        </View>
      </header>
      <ScrollView
        contentContainerClassName="bg-[center_top_50svh] bg-no-repeat bg-contain"
        contentContainerStyle={{ backgroundImage: `url(${calligraphy.uri})` }}
      >
        <div className="h-px w-full" ref={ref} /* Scroll detector */ />
        <Slot />
        <footer
          className={`
            mt-20 flex justify-center border-0 border-t border-solid border-bg-1 py-6 pt-20
          `}
        >
          <div className="www-px-comfortable flex w-full max-w-www-col">
            <div
              className={`
                w-full flex-col gap-0

                md:flex-row md:gap-8
              `}
            >
              <div
                className={`
                  grid grow grid-cols-1 gap-8 pb-10

                  md:grid-cols-3
                `}
              >
                <div>
                  <div className={footerLinkTitle()}>Product</div>
                  <div>
                    <Link className={footerLinkClass()} href="/">
                      Features
                    </Link>
                  </div>
                  <div>
                    <Link className={footerLinkClass()} href="/">
                      Pricing
                    </Link>
                  </div>
                  <div>
                    <Link className={footerLinkClass()} href="/login">
                      Sign up
                    </Link>
                  </div>
                  <div>
                    <Link className={footerLinkClass()} href="/login">
                      Log in
                    </Link>
                  </div>
                </div>
                <div>
                  <div className={footerLinkTitle()}>Resources</div>
                  <div>
                    <Link
                      className={footerLinkClass()}
                      href="https://github.com/haohao-how/haohaohow/"
                    >
                      Github
                    </Link>
                  </div>
                  <div>
                    <Link className={footerLinkClass()} href="/">
                      Documentation
                    </Link>
                  </div>
                  <div>
                    <Link className={footerLinkClass()} href="/">
                      Guides
                    </Link>
                  </div>
                  <div>
                    <Link className={footerLinkClass()} href="/company">
                      Company
                    </Link>
                  </div>
                </div>
                <div>
                  <div className={footerLinkTitle()}>Privacy and terms</div>
                  <div>
                    <Link className={footerLinkClass()} href="/">
                      Terms
                    </Link>
                  </div>
                  <div>
                    <Link className={footerLinkClass()} href="/">
                      Privacy
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </ScrollView>
    </>
  );
}

const footerLinkTitle = tv({
  base: `www-text-footer-title mb-2`,
});

const footerLinkClass = tv({
  base: `
    www-text-footer-link my-0.5 inline-block py-0.5 text-caption no-underline

    hover:text-cyanold

    focus-visible:ring
  `,
});
