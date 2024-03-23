import * as ReactDOM from "react-dom/client";
const root = document.getElementById('app-root');

const App = () => {
    return (
        <div>
            <h1>React app root!</h1>
        </div>
    );
}

ReactDOM.createRoot(root).render(<App/>);