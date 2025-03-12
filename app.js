import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const ItemTypes = {
    NODE: 'node',
};

const Node = ({ id, text }) => {
    const [, ref] = useDrag({
        type: ItemTypes.NODE,
        item: { id },
    });

    return (
        <div ref={ref} className="node">
            {text}
        </div>
    );
};

const MindMap = () => {
    const [nodes, setNodes] = useState([
        { id: 1, text: 'Node 1' },
        { id: 2, text: 'Node 2' },
    ]);

    const [, drop] = useDrop({
        accept: ItemTypes.NODE,
        drop: (item, monitor) => {
            console.log(`Dropped node: ${item.id}`);
        },
    });

    const exportToJson = () => {
        const json = JSON.stringify(nodes, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindmap.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const importFromJson = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const json = JSON.parse(e.target.result);
                setNodes(json);
            };
            reader.readAsText(file);
        }
    };

    return (
        <div ref={drop} style={{ width: '100%', height: '100%' }}>
            <h1>Mind Mapping App</h1>
            {nodes.map(node => (
                <Node key={node.id} id={node.id} text={node.text} />
            ))}
            <button onClick={exportToJson}>Export to JSON</button>
            <input type="file" accept=".json" onChange={importFromJson} />
        </div>
    );
};

const App = () => (
    <DndProvider backend={HTML5Backend}>
        <MindMap />
    </DndProvider>
);

ReactDOM.render(<App />, document.getElementById('root'));
