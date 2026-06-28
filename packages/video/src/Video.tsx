import { Sequence } from 'remotion';
import { SCENES } from './lib/timing';
import { HookScene } from './scenes/HookScene';
import { TestCreationScene } from './scenes/TestCreationScene';
import { RunningScene } from './scenes/RunningScene';
import { ResultsScene } from './scenes/ResultsScene';
import { PersonaScene } from './scenes/PersonaScene';
import { ClosingScene } from './scenes/ClosingScene';

export const Video: React.FC = () => {
  return (
    <>
      <Sequence from={SCENES.hook.start} durationInFrames={SCENES.hook.duration} name="Hook + Logo">
        <HookScene />
      </Sequence>
      <Sequence from={SCENES.testCreation.start} durationInFrames={SCENES.testCreation.duration} name="Test Creation">
        <TestCreationScene />
      </Sequence>
      <Sequence from={SCENES.running.start} durationInFrames={SCENES.running.duration} name="Running">
        <RunningScene />
      </Sequence>
      <Sequence from={SCENES.results.start} durationInFrames={SCENES.results.duration} name="Results">
        <ResultsScene />
      </Sequence>
      <Sequence from={SCENES.personas.start} durationInFrames={SCENES.personas.duration} name="Personas">
        <PersonaScene />
      </Sequence>
      <Sequence from={SCENES.closing.start} durationInFrames={SCENES.closing.duration} name="Closing">
        <ClosingScene />
      </Sequence>
    </>
  );
};
