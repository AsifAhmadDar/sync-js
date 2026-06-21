import { EventBus } from '../src/events';

describe('EventBus', () => {
  it('should emit and receive events', () => {
    const bus = new EventBus<Record<string, string>>();
    const results: string[] = [];

    bus.on('test', (event) => {
      results.push(event);
    });

    bus.emit('test', 'hello');
    bus.emit('test', 'world');

    expect(results).toEqual(['hello', 'world']);
  });

  it('should support async listeners', async () => {
    const bus = new EventBus<Record<string, string>>();
    const results: string[] = [];

    bus.onAsync('async', async (event) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      results.push(event);
    });

    await bus.emitAsync('async', 'test');

    expect(results).toEqual(['test']);
  });

  it('should support once listeners', () => {
    const bus = new EventBus<Record<string, string>>();
    const results: string[] = [];

    bus.once('once', (event) => {
      results.push(event);
    });

    bus.emit('once', 'first');
    bus.emit('once', 'second');

    expect(results).toEqual(['first']);
  });

  it('should support unsubscribe', () => {
    const bus = new EventBus<Record<string, string>>();
    const results: string[] = [];

    const unsubscribe = bus.on('test', (event) => {
      results.push(event);
    });

    bus.emit('test', 'first');
    unsubscribe();
    bus.emit('test', 'second');

    expect(results).toEqual(['first']);
  });

  it('should track listener count', () => {
    const bus = new EventBus<Record<string, string>>();

    const unsub1 = bus.on('test', () => {});
    const unsub2 = bus.on('test', () => {});

    expect(bus.listenerCount('test')).toBe(2);

    unsub1();
    expect(bus.listenerCount('test')).toBe(1);

    unsub2();
    expect(bus.listenerCount('test')).toBe(0);
  });
});
