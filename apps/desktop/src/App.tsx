import "./App.css";
import { CODE_WIDGET_QUERY_PARAM, } from "./components/editor/extensions/widget/code/messages";
import { WidgetSandboxApp, } from "./components/editor/extensions/widget/code/SandboxApp";
import AppLayout from "./components/layout/AppLayout";

function App() {
  if (typeof window !== "undefined") {
    const search = new URLSearchParams(window.location.search,);
    if (search.get(CODE_WIDGET_QUERY_PARAM,) === "1") {
      return <WidgetSandboxApp />;
    }
  }

  return <AppLayout />;
}

export default App;
