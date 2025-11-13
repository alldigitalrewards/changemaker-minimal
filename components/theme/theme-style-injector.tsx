import { getThemeConfig, generateThemeCSS } from "@/lib/theme/utils";

/**
 * Server component that injects theme CSS variables into the page
 * This prevents FOUC (Flash of Unstyled Content) by applying theme on initial render
 */
interface ThemeStyleInjectorProps {
  theme: string | null | undefined;
}

export default function ThemeStyleInjector({ theme }: ThemeStyleInjectorProps) {
  const themeConfig = getThemeConfig(theme);
  const css = generateThemeCSS(themeConfig);

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: css,
      }}
      data-theme-injector
      data-theme-name={themeConfig.name}
    />
  );
}
