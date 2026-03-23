import { invoke, } from "@tauri-apps/api/core";
import { listen, type UnlistenFn, } from "@tauri-apps/api/event";

export type ListenerState = "active" | "inactive" | "finalizing";

export interface ListenerSessionParams {
  session_id: string;
  languages: string[];
  onboarding: boolean;
  record_enabled: boolean;
  model: string;
  base_url: string;
  api_key: string;
  keywords: string[];
}

export type ListenerStreamWord = {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker: number | null;
  punctuated_word: string | null;
  language: string | null;
};

export type ListenerStreamAlternatives = {
  transcript: string;
  words: ListenerStreamWord[];
  confidence: number;
  languages?: string[];
};

export type ListenerStreamChannel = {
  alternatives: ListenerStreamAlternatives[];
};

export type ListenerStreamMetadata = {
  request_id: string;
  model_info: {
    name: string;
    version: string;
    arch: string;
  };
  model_uuid: string;
  extra?: {
    started_unix_millis: number;
  };
};

export type ListenerStreamResponse =
  | {
    type: "Results";
    start: number;
    duration: number;
    is_final: boolean;
    speech_final: boolean;
    from_finalize: boolean;
    channel: ListenerStreamChannel;
    metadata: ListenerStreamMetadata;
    channel_index: number[];
  }
  | {
    type: "Metadata";
    request_id: string;
    created: string;
    duration: number;
    channels: number;
  }
  | {
    type: "SpeechStarted";
    channel: number[];
    timestamp: number;
  }
  | {
    type: "UtteranceEnd";
    channel: number[];
    last_word_end: number;
  }
  | {
    type: "Error";
    error_code: number | null;
    error_message: string;
    provider: string;
  };

export type ListenerSessionDataEvent =
  | {
    type: "audio_amplitude";
    session_id: string;
    mic: number;
    speaker: number;
  }
  | {
    type: "mic_muted";
    session_id: string;
    value: boolean;
  }
  | {
    type: "stream_response";
    session_id: string;
    response: ListenerStreamResponse;
  };

export type ListenerSessionErrorEvent =
  | {
    type: "audio_error";
    session_id: string;
    error: string;
    device: string | null;
    is_fatal: boolean;
  }
  | {
    type: "connection_error";
    session_id: string;
    error: string;
  };

export type ListenerSessionLifecycleEvent =
  | {
    type: "inactive";
    session_id: string;
    error: string | null;
  }
  | {
    type: "active";
    session_id: string;
    error?: {
      type: string;
      provider?: string;
      message?: string;
    } | null;
  }
  | {
    type: "finalizing";
    session_id: string;
  };

export type ListenerSessionProgressEvent =
  | {
    type: "audio_initializing";
    session_id: string;
  }
  | {
    type: "audio_ready";
    session_id: string;
    device: string | null;
  }
  | {
    type: "connecting";
    session_id: string;
  }
  | {
    type: "connected";
    session_id: string;
    adapter: string;
  };

export function startListenerSession(params: ListenerSessionParams,) {
  return invoke<void>("plugin:listener|start_session", { params, },);
}

export function stopListenerSession() {
  return invoke<void>("plugin:listener|stop_session",);
}

export function getListenerState() {
  return invoke<ListenerState>("plugin:listener|get_state",);
}

export function listenToListenerSessionData(
  callback: (event: ListenerSessionDataEvent,) => void,
): Promise<UnlistenFn> {
  return listen<ListenerSessionDataEvent>("plugin:listener:session-data-event", (event,) => callback(event.payload,),);
}

export function listenToListenerSessionError(
  callback: (event: ListenerSessionErrorEvent,) => void,
): Promise<UnlistenFn> {
  return listen<ListenerSessionErrorEvent>(
    "plugin:listener:session-error-event",
    (event,) => callback(event.payload,),
  );
}

export function listenToListenerSessionLifecycle(
  callback: (event: ListenerSessionLifecycleEvent,) => void,
): Promise<UnlistenFn> {
  return listen<ListenerSessionLifecycleEvent>(
    "plugin:listener:session-lifecycle-event",
    (event,) => callback(event.payload,),
  );
}

export function listenToListenerSessionProgress(
  callback: (event: ListenerSessionProgressEvent,) => void,
): Promise<UnlistenFn> {
  return listen<ListenerSessionProgressEvent>(
    "plugin:listener:session-progress-event",
    (event,) => callback(event.payload,),
  );
}

export function getTranscriptTextFromListenerEvent(event: ListenerSessionDataEvent,) {
  if (event.type !== "stream_response" || event.response.type !== "Results") {
    return "";
  }

  const alternative = event.response.channel.alternatives[0];
  return alternative?.transcript?.trim() ?? "";
}
