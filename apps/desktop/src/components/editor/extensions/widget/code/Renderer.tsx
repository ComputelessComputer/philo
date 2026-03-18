import * as React from "react";
import { Component, useEffect, useMemo, useState, } from "react";
import type { ErrorInfo, ReactNode, } from "react";
import type { SharedWidgetRuntimeApi, } from "../runtime";
import { compileCodeWidgetSource, } from "./compiler";
import { WidgetSdkProvider, } from "./sdk";
import * as PhiloSdk from "./sdk";

type WidgetComponent = React.ComponentType;

type WidgetBridge = {
  runQuery: (name: string, params?: Record<string, unknown>,) => Promise<Array<Record<string, unknown>>>;
  runMutation: (name: string, params?: Record<string, unknown>,) => Promise<number>;
};

function WidgetError({ title, message, }: { title: string; message: string; },) {
  return (
    <div className="widget-error">
      <p className="widget-error-title">{title}</p>
      <p className="widget-error-message">{message}</p>
    </div>
  );
}

class WidgetRenderBoundary extends Component<
  { onError: (message: string,) => void; children: ReactNode; },
  { error: string | null; }
> {
  state = { error: null as string | null, };

  static getDerivedStateFromError(error: Error,) {
    return { error: error.message, };
  }

  componentDidCatch(error: Error, _info: ErrorInfo,) {
    this.props.onError(error.message,);
  }

  render() {
    if (this.state.error) {
      return <WidgetError title="Code widget failed" message={this.state.error} />;
    }

    return this.props.children;
  }
}

function evaluateWidgetModule(code: string,): WidgetComponent {
  const run = new Function(
    "Philo",
    "PhiloReact",
    `${code}
const moduleValue = typeof __PHILO_WIDGET_MODULE__ !== "undefined"
  ? __PHILO_WIDGET_MODULE__
  : globalThis.__PHILO_WIDGET_MODULE__;
return moduleValue?.default ?? moduleValue;`,
  );
  const component = run(PhiloSdk, React,) as WidgetComponent | undefined;
  if (typeof component !== "function") {
    throw new Error("Compiled widget did not export a default component.",);
  }
  return component;
}

export function CodeWidgetRenderer({
  runtime,
  source,
}: {
  runtime: SharedWidgetRuntimeApi;
  source: string;
},) {
  const [compiledCode, setCompiledCode,] = useState<string | null>(null,);
  const [Widget, setWidget,] = useState<WidgetComponent | null>(null,);
  const [compileError, setCompileError,] = useState<string | null>(null,);
  const [runtimeError, setRuntimeError,] = useState<string | null>(null,);

  const bridge = useMemo<WidgetBridge>(() => ({
    runQuery: async (name: string, params: Record<string, unknown> = {},) => await runtime.runQuery(name, params,),
    runMutation: async (name: string, params: Record<string, unknown> = {},) =>
      await runtime.runMutation(name, params,),
  }), [runtime,],);

  useEffect(() => {
    let active = true;
    setCompiledCode(null,);
    setWidget(null,);
    setCompileError(null,);
    setRuntimeError(null,);
    void compileCodeWidgetSource(source,)
      .then(({ code, },) => {
        if (!active) return;
        setCompiledCode(code,);
      },)
      .catch((error,) => {
        if (!active) return;
        setCompileError(error instanceof Error ? error.message : "Compilation failed.",);
      },);
    return () => {
      active = false;
    };
  }, [source,],);

  useEffect(() => {
    if (!compiledCode) return;

    try {
      setRuntimeError(null,);
      setWidget(() => evaluateWidgetModule(compiledCode,));
    } catch (error) {
      setWidget(null,);
      setRuntimeError(error instanceof Error ? error.message : "Widget evaluation failed.",);
    }
  }, [compiledCode,],);

  if (compileError) {
    return <WidgetError title="Code widget failed" message={compileError} />;
  }

  if (runtimeError) {
    return <WidgetError title="Code widget failed" message={runtimeError} />;
  }

  if (!Widget) {
    return (
      <div className="widget-render">
        <WidgetError title="Loading widget" message="Preparing the code runtime." />
      </div>
    );
  }

  return (
    <div className="widget-render">
      <WidgetSdkProvider bridge={bridge}>
        <WidgetRenderBoundary onError={setRuntimeError}>
          <Widget />
        </WidgetRenderBoundary>
      </WidgetSdkProvider>
    </div>
  );
}
