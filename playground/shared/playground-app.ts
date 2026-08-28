import { fk } from 'framekit';

import { createScaledPageShell, type ScaledPageShellOptions } from './page-shell';

type Navigate = (offset: number) => void;

type PlaygroundSections = Readonly<{
  createHero: (onExplore: () => void) => fk.GuiNode;
  createPrinciples: () => fk.GuiNode;
  createMotion: () => fk.GuiNode;
  createComposer: () => fk.GuiNode;
  createValues: () => fk.GuiNode;
  createApi: () => fk.GuiNode;
  createGuide: () => fk.GuiNode;
  createLifecycle: () => fk.GuiNode;
  createFooter: (onBackToTop: () => void) => fk.GuiNode;
}>;

type PlaygroundAppOptions = Readonly<{
  shell: ScaledPageShellOptions;
  exploreOffset: number;
  sections: PlaygroundSections;
  createNavigation: (
    page: fk.ScrollingFrameNode,
    navigate: Navigate,
    pageScale: () => number,
  ) => fk.GuiNode;
}>;

/** Composes the shared product story while device modules own each presentation. */
export function createPlaygroundApp(options: PlaygroundAppOptions): fk.ScreenGuiNode {
  const { app, page, content, navigate, pageScale } = createScaledPageShell(options.shell);
  const sections = options.sections;

  content.addChild(sections.createHero(() => navigate(options.exploreOffset)));
  content.addChild(sections.createPrinciples());
  content.addChild(sections.createMotion());
  content.addChild(sections.createComposer());
  content.addChild(sections.createValues());
  content.addChild(sections.createApi());
  content.addChild(sections.createGuide());
  content.addChild(sections.createLifecycle());
  content.addChild(sections.createFooter(() => navigate(0)));

  app.addChild(options.createNavigation(page, navigate, pageScale));
  return app;
}
