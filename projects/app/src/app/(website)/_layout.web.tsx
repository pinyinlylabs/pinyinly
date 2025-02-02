import { RectButton2 } from "@/client/ui/RectButton2";
import { useWebsiteStore } from "@/client/website";
import { invariant } from "@haohaohow/lib/invariant";
import { Image } from "expo-image";
import { Link, Slot } from "expo-router";
import { ScrollView, View } from "react-native";
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
        className={`www-px-comfortable fixed left-0 right-0 top-0 z-50 flex h-[72px] justify-center border-0 bg-background transition-all ${!isIntersecting ? `border-b-2 border-solid border-primary-5` : ``}`}
      >
        <View className="flex w-full max-w-www-col justify-between">
          <View className="h-full w-full flex-row justify-center md:justify-start">
            <Image
              source={require(`@/assets/logo/logo-row.svg`)}
              className="h-[40px] w-[200px] flex-shrink self-center text-primary-12"
              tintColor="currentColor"
              contentFit="fill"
            />

            <View
              className={`flex-1 flex-row items-center justify-end gap-2 ${isBodyGetStartedVisible ? `hidden` : ``}`}
            >
              <Link href="/dashboard" asChild>
                <RectButton2
                  variant="filled"
                  accent
                  textClassName="www-text-button"
                >
                  Get Started
                </RectButton2>
              </Link>
            </View>
          </View>
        </View>
      </header>
      <ScrollView
        contentContainerClassName=" bg-[center_top_50svh] bg-no-repeat bg-contain"
        contentContainerStyle={{ backgroundImage: `url(${calligraphy.uri})` }}
      >
        <div className="h-[1px] w-full" ref={ref} /* Scroll detector */ />
        <Slot />
        <footer className="mt-20 flex justify-center border-x-0 border-y-0 border-t border-solid border-primary-5 py-6 pt-20">
          <div className="www-px-comfortable flex w-full max-w-www-col">
            <div className="w-full flex-col gap-0 md:flex-row md:gap-8">
              <div className="grid flex-grow grid-cols-1 gap-8 pb-10 md:grid-cols-3">
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
  base: `text-primary-10 no-underline www-text-footer-link focus-visible:focus-ring hover:text-accent-10 my-0.5 inline-block py-0.5`,
});
