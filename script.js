document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('game-board');
    const scoreElement = document.getElementById('score');
    const highScoreElement = document.getElementById('high-score');
    const overlay = document.getElementById('game-overlay');
    const messageElement = document.getElementById('game-message');
    const newGameBtn = document.getElementById('new-game-btn');
    const tryAgainBtn = document.getElementById('try-again-btn');
    
    const aiButtons = document.querySelectorAll('.ai-btn');
    const stopAiBtn = document.getElementById('stop-ai-btn');

    const SIZE = 4;
    let board = [];
    let score = 0;
    let highScore = localStorage.getItem('highScore2048') || 0;
    let isGameOver = false;
    let aiInterval = null;

    // --- Core Game Logic ---

    function startGame() {
        board = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));
        score = 0;
        isGameOver = false;
        stopAI(); // Stop any running AI
        
        spawnTile();
        spawnTile();
        
        updateUI();
        overlay.classList.remove('show');
    }

    function updateUI() {
        scoreElement.textContent = score;
        highScoreElement.textContent = highScore;
        boardElement.innerHTML = '';

        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                boardElement.appendChild(cell);

                if (board[r][c] !== 0) {
                    const tile = document.createElement('div');
                    const value = board[r][c];
                    tile.classList.add('tile');
                    tile.dataset.value = value;
                    tile.textContent = value;
                    
                    // Adjust font size for larger numbers
                    if (value > 1000) tile.style.fontSize = '2rem';
                    else if (value > 100) tile.style.fontSize = '2.5rem';
                    else tile.style.fontSize = '3rem';

                    // Position tile on the grid
                    const tileWidth = (boardElement.clientWidth - 15 * (SIZE + 1)) / SIZE;
                    tile.style.width = `${tileWidth}px`;
                    tile.style.height = `${tileWidth}px`;
                    tile.style.top = `${r * (tileWidth + 15) + 15}px`;
                    tile.style.left = `${c * (tileWidth + 15) + 15}px`;
                    
                    boardElement.appendChild(tile);
                }
            }
        }
    }

    function getEmptyTiles() {
        const emptyTiles = [];
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (board[r][c] === 0) {
                    emptyTiles.push({ r, c });
                }
            }
        }
        return emptyTiles;
    }

    function spawnTile() {
        const emptyTiles = getEmptyTiles();
        if (emptyTiles.length > 0) {
            const { r, c } = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
            board[r][c] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    // --- Movement Logic ---

    function slideAndMergeRow(row) {
        let newRow = row.filter(val => val !== 0);
        let mergeScore = 0;
        for (let i = 0; i < newRow.length - 1; i++) {
            if (newRow[i] === newRow[i + 1]) {
                newRow[i] *= 2;
                mergeScore += newRow[i];
                newRow.splice(i + 1, 1);
            }
        }
        while (newRow.length < SIZE) {
            newRow.push(0);
        }
        return { newRow, mergeScore };
    }

    function transpose(matrix) {
        return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
    }

    function reverse(matrix) {
        return matrix.map(row => row.slice().reverse());
    }

    function move(direction) {
        if (isGameOver) return;

        const originalBoard = JSON.stringify(board);
        let moveScore = 0;
        let tempBoard = board.map(row => row.slice()); // Deep copy

        if (direction === 'up') {
            tempBoard = transpose(tempBoard);
            for (let i = 0; i < SIZE; i++) {
                const { newRow, mergeScore } = slideAndMergeRow(tempBoard[i]);
                tempBoard[i] = newRow;
                moveScore += mergeScore;
            }
            tempBoard = transpose(tempBoard);
        } else if (direction === 'down') {
            tempBoard = transpose(tempBoard);
            tempBoard = reverse(tempBoard);
            for (let i = 0; i < SIZE; i++) {
                const { newRow, mergeScore } = slideAndMergeRow(tempBoard[i]);
                tempBoard[i] = newRow;
                moveScore += mergeScore;
            }
            tempBoard = reverse(tempBoard);
            tempBoard = transpose(tempBoard);
        } else if (direction === 'left') {
            for (let i = 0; i < SIZE; i++) {
                const { newRow, mergeScore } = slideAndMergeRow(tempBoard[i]);
                tempBoard[i] = newRow;
                moveScore += mergeScore;
            }
        } else if (direction === 'right') {
            tempBoard = reverse(tempBoard);
            for (let i = 0; i < SIZE; i++) {
                const { newRow, mergeScore } = slideAndMergeRow(tempBoard[i]);
                tempBoard[i] = newRow;
                moveScore += mergeScore;
            }
            tempBoard = reverse(tempBoard);
        }

        if (JSON.stringify(tempBoard) !== originalBoard) {
            board = tempBoard;
            score += moveScore;
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('highScore2048', highScore);
            }
            spawnTile();
            checkGameOver();
            updateUI();
            return true; // Move was successful
        }
        return false; // Move was not successful
    }

    // --- Game State Checks ---

    function checkGameOver() {
        if (getEmptyTiles().length > 0) return;

        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const val = board[r][c];
                if (c < SIZE - 1 && val === board[r][c + 1]) return;
                if (r < SIZE - 1 && val === board[r + 1][c]) return;
            }
        }

        isGameOver = true;
        messageElement.textContent = 'Game Over!';
        overlay.classList.add('show');
    }
    
    function checkForWin() {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (board[r][c] === 2048) {
                    messageElement.textContent = 'You Win!';
                    overlay.classList.add('show');
                    isGameOver = true; // Allow continuing, but show win message
                    return;
                }
            }
        }
    }

    // --- Event Listeners ---

    document.addEventListener('keydown', e => {
        if (aiInterval) return; // Disable manual control when AI is active
        switch (e.key) {
            case 'ArrowUp': move('up'); break;
            case 'ArrowDown': move('down'); break;
            case 'ArrowLeft': move('left'); break;
            case 'ArrowRight': move('right'); break;
        }
    });

    newGameBtn.addEventListener('click', startGame);
    tryAgainBtn.addEventListener('click', startGame);
    window.addEventListener('resize', updateUI);

    // --- AI Logic ---

    function getValidMoves(currentBoard) {
        const directions = ['up', 'down', 'left', 'right'];
        const validMoves = [];
        for (const direction of directions) {
            const tempGame = { board: JSON.parse(JSON.stringify(currentBoard)), score: 0 };
            if (simulateMove(tempGame, direction)) {
                validMoves.push(direction);
            }
        }
        return validMoves;
    }
    
    function simulateMove(game, direction) {
        const originalBoard = JSON.stringify(game.board);
        let tempBoard = game.board.map(row => row.slice());

        if (direction === 'up') {
            tempBoard = transpose(tempBoard);
            for (let i = 0; i < SIZE; i++) tempBoard[i] = slideAndMergeRow(tempBoard[i]).newRow;
            tempBoard = transpose(tempBoard);
        } else if (direction === 'down') {
            tempBoard = transpose(reverse(tempBoard));
            for (let i = 0; i < SIZE; i++) tempBoard[i] = slideAndMergeRow(tempBoard[i]).newRow;
            tempBoard = reverse(transpose(tempBoard));
        } else if (direction === 'left') {
            for (let i = 0; i < SIZE; i++) tempBoard[i] = slideAndMergeRow(tempBoard[i]).newRow;
        } else if (direction === 'right') {
            tempBoard = reverse(tempBoard);
            for (let i = 0; i < SIZE; i++) tempBoard[i] = slideAndMergeRow(tempBoard[i]).newRow;
            tempBoard = reverse(tempBoard);
        }
        
        return JSON.stringify(tempBoard) !== originalBoard;
    }

    const aiStrategies = {
        random: (currentBoard) => {
            const validMoves = getValidMoves(currentBoard);
            return validMoves.length > 0 ? validMoves[Math.floor(Math.random() * validMoves.length)] : null;
        },
        corner: (currentBoard) => {
            const validMoves = getValidMoves(currentBoard);
            const priority = ['down', 'right', 'up', 'left'];
            for (const move of priority) {
                if (validMoves.includes(move)) return move;
            }
            return null;
        },
        greedy: (currentBoard) => {
            let bestMove = null;
            let maxScore = -1;
            for (const move of getValidMoves(currentBoard)) {
                let tempBoard = JSON.parse(JSON.stringify(currentBoard));
                let moveScore = 0;
                
                // Simplified simulation for score calculation
                let boardCopy = tempBoard.map(r => r.slice());
                if (move === 'up') boardCopy = transpose(boardCopy);
                if (move === 'down') boardCopy = transpose(reverse(boardCopy));
                if (move === 'right') boardCopy = reverse(boardCopy);

                for (let i = 0; i < SIZE; i++) {
                    moveScore += slideAndMergeRow(boardCopy[i]).mergeScore;
                }

                if (moveScore > maxScore) {
                    maxScore = moveScore;
                    bestMove = move;
                }
            }
            return bestMove;
        },
        lookahead: (currentBoard) => {
            let bestMove = null;
            let maxEmptyTiles = -1;
            let bestScore = -1;

            for (const move of getValidMoves(currentBoard)) {
                let tempBoard = JSON.parse(JSON.stringify(currentBoard));
                let tempScore = 0;

                // Full simulation to get next state
                let boardCopy = tempBoard.map(r => r.slice());
                if (move === 'up') {
                    boardCopy = transpose(boardCopy);
                    for (let i = 0; i < SIZE; i++) { const res = slideAndMergeRow(boardCopy[i]); boardCopy[i] = res.newRow; tempScore += res.mergeScore; }
                    boardCopy = transpose(boardCopy);
                } else if (move === 'down') {
                    boardCopy = transpose(reverse(boardCopy));
                    for (let i = 0; i < SIZE; i++) { const res = slideAndMergeRow(boardCopy[i]); boardCopy[i] = res.newRow; tempScore += res.mergeScore; }
                    boardCopy = reverse(transpose(boardCopy));
                } else if (move === 'left') {
                    for (let i = 0; i < SIZE; i++) { const res = slideAndMergeRow(boardCopy[i]); boardCopy[i] = res.newRow; tempScore += res.mergeScore; }
                } else if (move === 'right') {
                    boardCopy = reverse(boardCopy);
                    for (let i = 0; i < SIZE; i++) { const res = slideAndMergeRow(boardCopy[i]); boardCopy[i] = res.newRow; tempScore += res.mergeScore; }
                    boardCopy = reverse(boardCopy);
                }
                
                const emptyTiles = boardCopy.flat().filter(v => v === 0).length;

                if (emptyTiles > maxEmptyTiles) {
                    maxEmptyTiles = emptyTiles;
                    bestMove = move;
                    bestScore = tempScore;
                } else if (emptyTiles === maxEmptyTiles) {
                    if (tempScore > bestScore) {
                        bestScore = tempScore;
                        bestMove = move;
                    }
                }
            }
            return bestMove;
        }
    };

    function startAI(strategy) {
        stopAI(); // Ensure no other AI is running
        const aiFunction = aiStrategies[strategy];
        if (!aiFunction) return;

        stopAiBtn.disabled = false;
        aiButtons.forEach(btn => btn.disabled = true);

        aiInterval = setInterval(() => {
            if (isGameOver) {
                stopAI();
                return;
            }
            const bestMove = aiFunction(board);
            if (bestMove) {
                move(bestMove);
            } else {
                // No valid moves left
                stopAI();
                checkGameOver(); // This will trigger the game over screen
            }
        }, 100); // AI move delay
    }

    function stopAI() {
        clearInterval(aiInterval);
        aiInterval = null;
        stopAiBtn.disabled = true;
        aiButtons.forEach(btn => btn.disabled = false);
    }

    aiButtons.forEach(button => {
        button.addEventListener('click', () => {
            const strategy = button.dataset.strategy;
            startGame(); // Start a new game for the AI
            startAI(strategy);
        });
    });

    stopAiBtn.addEventListener('click', stopAI);

    // --- Initial Load ---
    startGame();
});