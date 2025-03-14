// モジュールをグローバル変数から取得
const React = window.React;
const { useState, useRef, useEffect, useCallback } = React;
const ReactDOM = window.ReactDOM;
const { DndProvider, useDrag, useDrop } = window.ReactDnD;
const HTML5Backend = window.ReactDnDHTML5Backend.HTML5Backend;

const ItemTypes = {
    NODE: 'node',
};

// ノード間の接続線コンポーネント
const Connection = ({ startPos, endPos }) => {
    if (!startPos || !endPos) return null;
    
    return (
        <svg style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1
        }}>
            <line
                x1={startPos.x}
                y1={startPos.y}
                x2={endPos.x}
                y2={endPos.y}
                style={{ stroke: '#999', strokeWidth: 2 }}
            />
        </svg>
    );
};

const Node = ({ id, text, position, parentId, onPositionChange, getNodePosition, isSelected, onSelect }) => {
    const nodeRef = useRef(null);
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.NODE,
        item: { id, originalPosition: position },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    });

    useEffect(() => {
        if (nodeRef.current) {
            const width = nodeRef.current.offsetWidth;
            const height = nodeRef.current.offsetHeight;
            
            // Only update if dimensions have actually changed to avoid infinite updates
            onPositionChange(id, {
                x: position.x,
                y: position.y,
                width,
                height
            });
        }
    // Run this effect only when position changes or on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [position.x, position.y, id]);

    // 親ノードへの接続線を描画
    const renderConnection = () => {
        if (!parentId) return null;
        
        const parentPos = getNodePosition(parentId);
        const currentPos = getNodePosition(id);
        
        if (parentPos && currentPos) {
            const startX = parentPos.x + parentPos.width / 2;
            const startY = parentPos.y + parentPos.height / 2;
            const endX = currentPos.x + currentPos.width / 2;
            const endY = currentPos.y + currentPos.height / 2;
            
            return (
                <Connection
                    startPos={{ x: startX, y: startY }}
                    endPos={{ x: endX, y: endY }}
                />
            );
        }
        
        return null;
    };

    return (
        <>
            {renderConnection()}
            <div
                ref={(node) => {
                    nodeRef.current = node;
                    drag(node);
                }}
                className={`node ${isSelected ? 'selected' : ''}`}
                style={{
                    position: 'absolute',
                    left: position.x,
                    top: position.y,
                    opacity: isDragging ? 0.5 : 1,
                }}
                onClick={(e) => {
                    onSelect(id);
                    e.stopPropagation();
                }}
            >
                {text}
            </div>
        </>
    );
};

const MindMap = () => {
    const canvasRef = useRef(null);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [nodes, setNodes] = useState([
        { id: 1, text: 'メインアイデア', position: { x: 400, y: 200 }, parentId: null },
        { id: 2, text: 'サブアイデア 1', position: { x: 250, y: 300 }, parentId: 1 },
        { id: 3, text: 'サブアイデア 2', position: { x: 550, y: 300 }, parentId: 1 },
        { id: 4, text: 'サブアイデア 1-1', position: { x: 150, y: 400 }, parentId: 2 },
        { id: 5, text: 'サブアイデア 2-1', position: { x: 450, y: 400 }, parentId: 3 },
        { id: 6, text: 'サブアイデア 2-2', position: { x: 650, y: 400 }, parentId: 3 },
    ]);
    
    const [nodePositions, setNodePositions] = useState({});
    const [nextId, setNextId] = useState(7);

    const [, drop] = useDrop({
        accept: ItemTypes.NODE,
        drop: (item, monitor) => {
            const delta = monitor.getDifferenceFromInitialOffset();
            const originalPosition = item.originalPosition;
            
            const updatedNodes = nodes.map(node => {
                if (node.id === item.id) {
                    return {
                        ...node,
                        position: {
                            x: originalPosition.x + delta.x,
                            y: originalPosition.y + delta.y
                        }
                    };
                }
                return node;
            });
            
            setNodes(updatedNodes);
        },
    });

const handleNodePositionChange = useCallback((id, positionData) => {
    setNodePositions(prev => ({
        ...prev,
        [id]: positionData
    }));
}, []);

    const getNodePosition = (id) => {
        return nodePositions[id];
    };

    const handleNodeSelect = (id) => {
        // 既に選択されているノードをクリックした場合は選択解除
        if (selectedNodeId === id) {
            setSelectedNodeId(null);
        } else {
            setSelectedNodeId(id);
        }
    };
    
    const addNewNode = () => {
        // 選択されたノードがある場合は、それを親として使用
        // なければルートノードを親として使用
        const parentNode = selectedNodeId 
            ? nodes.find(node => node.id === selectedNodeId)
            : nodes.find(node => node.parentId === null);
        
        if (!parentNode) return;
        
        // 親ノードの既存の子ノードを数える
        const childNodes = nodes.filter(node => node.parentId === parentNode.id);
        const childCount = childNodes.length;
        
        // 新しい仕様に基づく角度の計算
        // 最初の子ノードは120°の位置に
        // 2つ目以降は40°ずつ左に配置
        const firstChildAngle = 120; // 最初の子ノードの角度
        const angleStep = 40; // 子ノード間の角度差
        const angle = firstChildAngle + (childCount * angleStep);
        
        // 親ノードからの距離（一定）
        const distance = 150;
        
        // 角度からx, y座標を計算
        const angleRad = angle * (Math.PI / 180);
        const offsetX = Math.cos(angleRad) * distance;
        const offsetY = Math.sin(angleRad) * distance;
        
        const newNode = {
            id: nextId,
            text: `新しいアイデア ${nextId}`,
            position: { 
                x: parentNode.position.x + offsetX, 
                y: parentNode.position.y + offsetY 
            },
            parentId: parentNode.id
        };
        
        setNodes([...nodes, newNode]);
        setNextId(nextId + 1);
    };

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
                try {
                    const json = JSON.parse(e.target.result);
                    setNodes(json);
                    // 次のIDを設定（最大ID + 1）
                    const maxId = Math.max(...json.map(node => node.id));
                    setNextId(maxId + 1);
                } catch (error) {
                    console.error('JSONの解析に失敗しました:', error);
                    alert('ファイルの形式が正しくありません。');
                }
            };
            reader.readAsText(file);
        }
    };

    // Tabキーイベントリスナーを追加
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Tab') {
                e.preventDefault(); // ブラウザのデフォルト動作を防止
                addNewNode(); // 選択したノードに子ノードを追加
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedNodeId, nodes]); // selectedNodeIdとnodesを依存配列に追加

    return (
        <div 
            ref={(node) => {
                canvasRef.current = node;
                drop(node);
            }}
            className="mind-map-canvas"
            onClick={() => setSelectedNodeId(null)} // キャンバスをクリックした時に選択を解除
        >
            <h1>マインドマップアプリ</h1>
            <div className="controls">
                <button onClick={addNewNode}>新しいノードを追加</button>
                <button onClick={exportToJson}>エクスポート</button>
                <input type="file" accept=".json" onChange={importFromJson} />
            </div>
            {nodes.map(node => (
                <Node 
                    key={node.id} 
                    id={node.id} 
                    text={node.text} 
                    position={node.position} 
                    parentId={node.parentId}
                    onPositionChange={handleNodePositionChange}
                    getNodePosition={getNodePosition}
                    isSelected={selectedNodeId === node.id}
                    onSelect={handleNodeSelect}
                />
            ))}
        </div>
    );
};

const App = () => (
    <DndProvider backend={HTML5Backend}>
        <MindMap />
    </DndProvider>
);

ReactDOM.render(<App />, document.getElementById('root'));
