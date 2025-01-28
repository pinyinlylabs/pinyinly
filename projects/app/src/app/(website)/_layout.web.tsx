import { Image } from "expo-image";
import { Link, Slot } from "expo-router";
import { ScrollView, View } from "react-native";
import { tv } from "tailwind-variants";

export default function WebsiteLayout() {
  // Even though this looks like an no-op layout—it's not, and it ensures the
  // top and bottom of the app have the correct color.
  return (
    <ScrollView>
      <header>
        <View className="mx-auto my-6 max-w-7xl justify-center px-6 md:px-8 2xl:px-0">
          <View className="w-full flex-col gap-0 md:flex-row md:gap-8">
            <View className="flex-row items-center gap-2">
              <Image
                source={require(`@/assets/logo/logo-row.svg`)}
                className="h-[40px] w-[200px] flex-shrink text-primary-12"
                tintColor="currentColor"
                contentFit="fill"
              />
            </View>

            <View className="flex-1 flex-row items-center justify-end gap-2">
              <Link className={headerLinkClass()} href="/">
                Pricing
              </Link>
              <Link className={headerLinkClass()} href="/">
                Features
              </Link>
              <Link
                className={headerLinkClass({
                  className: `bg-accent-8 text-lg font-bold leading-9 text-text`,
                })}
                href="/"
              >
                Log in
              </Link>
            </View>
          </View>
        </View>
      </header>

      <Slot />

      <footer className="border-x-0 border-y-0 border-t border-solid border-primary-5 py-6">
        <div className="mx-auto max-w-7xl justify-center px-6 md:px-8 2xl:px-0">
          <div className="w-full flex-col gap-0 md:flex-row md:gap-8">
            <div className="grid flex-grow grid-cols-1 gap-8 pb-10 md:grid-cols-2 md:px-8 md:py-10">
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
            </div>
          </div>
        </div>
      </footer>
    </ScrollView>
  );
}

const headerLinkClass = tv({
  base: `text-primary-12 transition-all no-underline font-body focus-visible:focus-ring hover:text-primary-12 my-0.5 inline-block py-0.5 text-lg leading-6 hover:bg-primary-6 rounded-full px-4 h-10 leading-9`,
  //text-lg font-medium    hover:text-neutral-800 bg-neutral-50 text-neutral-900
});

const footerLinkTitle = tv({
  base: `text-primary-12 font-body mb-2 text-md`,
});

const footerLinkClass = tv({
  base: `text-primary-10 no-underline font-body focus-visible:focus-ring hover:text-accent-10 my-0.5 inline-block py-0.5 text-md leading-6`,
});
