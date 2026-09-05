// src/core/eventBus.ts

import { EventEmitter } from 'events';
import { BaseEvent, EventName } from './events/catalog';

type Listener<T> = (event: BaseEvent<T>) => void;

/**
 * Typed EventBus built on top of Node.js EventEmitter.
 * Exported as a singleton for the whole application.
 */
class TypedEventBus {
  private emitter = new EventEmitter();

  /** Emit a strongly‑typed event */
  emit<T>(event: BaseEvent<T>) {
    this.emitter.emit(event.type, event);
  }

  /** Register a listener for a specific event name */
  on<T>(type: EventName, listener: Listener<T>) {
    this.emitter.on(type, listener as Listener<any>);
  }

  /** Remove a listener */
  off<T>(type: EventName, listener: Listener<T>) {
    this.emitter.off(type, listener as Listener<any>);
  }
}

export const eventBus = new TypedEventBus();
