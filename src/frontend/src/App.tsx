import { Button } from "@/components/ui/button";
import { Bot, Minus, RotateCcw, Trophy, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

type Player = "X" | "O";
type Cell = Player | null;
type Board = Cell[];
type GameMode = "2player" | "bot";
type Difficulty = "easy" | "medium" | "hard";

const CELL_IDS = [
  "c0",
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
  "c7",
  "c8",
] as const;
const CELL_POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(board: Board): { winner: Player; line: number[] } | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as Player, line };
    }
  }
  return null;
}

function checkDraw(board: Board): boolean {
  return board.every((cell) => cell !== null);
}

// Minimax algorithm for optimal bot play
function minimax(board: Board, depth: number, isMaximizing: boolean): number {
  const result = checkWinner(board);
  if (result?.winner === "O") return 10 - depth;
  if (result?.winner === "X") return depth - 10;
  if (checkDraw(board)) return 0;

  if (isMaximizing) {
    let best = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        const newBoard = [...board];
        newBoard[i] = "O";
        best = Math.max(best, minimax(newBoard, depth + 1, false));
      }
    }
    return best;
  }
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      const newBoard = [...board];
      newBoard[i] = "X";
      best = Math.min(best, minimax(newBoard, depth + 1, true));
    }
  }
  return best;
}

function getRandomMove(board: Board): number {
  const empty = board
    .map((v, i) => (v === null ? i : -1))
    .filter((i) => i !== -1);
  return empty[Math.floor(Math.random() * empty.length)];
}

function getBestMove(board: Board): number {
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      const newBoard = [...board];
      newBoard[i] = "O";
      const score = minimax(newBoard, 0, false);
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }
  return bestMove;
}

function getBotMove(board: Board, difficulty: Difficulty): number {
  if (difficulty === "easy") {
    return getRandomMove(board);
  }
  if (difficulty === "medium") {
    return Math.random() < 0.5 ? getRandomMove(board) : getBestMove(board);
  }
  return getBestMove(board);
}

function CellButton({
  value,
  index,
  onClick,
  isWinning,
  disabled,
}: {
  value: Cell;
  index: number;
  onClick: () => void;
  isWinning: boolean;
  disabled: boolean;
}) {
  const ocid = `cell.button.${index + 1}` as const;

  return (
    <motion.button
      data-ocid={ocid}
      onClick={onClick}
      disabled={disabled || value !== null}
      className={[
        "relative flex items-center justify-center w-full aspect-square",
        "rounded-xl border-2 transition-all duration-300 select-none",
        "text-5xl sm:text-6xl font-display font-extrabold tracking-tight",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isWinning && value === "X" ? "glow-win-x" : "",
        isWinning && value === "O" ? "glow-win-o" : "",
        !isWinning && value === null && !disabled
          ? "border-muted hover:border-border bg-card hover:bg-muted/40 cursor-pointer"
          : "",
        !isWinning && value !== null
          ? "border-border bg-card cursor-default"
          : "",
        disabled && value === null
          ? "border-muted bg-card/50 cursor-not-allowed opacity-50"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      whileHover={!disabled && !value ? { scale: 1.04 } : {}}
      whileTap={!disabled && !value ? { scale: 0.95 } : {}}
    >
      <AnimatePresence>
        {value && (
          <motion.span
            key={value}
            initial={{ scale: 0, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className={value === "X" ? "text-x" : "text-o"}
          >
            {value}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

const DIFFICULTY_OPTIONS: { label: string; value: Difficulty; ocid: string }[] =
  [
    { label: "Easy", value: "easy", ocid: "difficulty.easy_button" },
    { label: "Medium", value: "medium", ocid: "difficulty.medium_button" },
    { label: "Hard", value: "hard", ocid: "difficulty.hard_button" },
  ];

export default function App() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>("X");
  const [scores, setScores] = useState({ X: 0, O: 0, draw: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [winResult, setWinResult] = useState<{
    winner: Player;
    line: number[];
  } | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>("2player");
  const [botThinking, setBotThinking] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const isVsBot = gameMode === "bot";

  const applyMove = useCallback((b: Board, index: number, player: Player) => {
    const newBoard = [...b];
    newBoard[index] = player;
    return newBoard;
  }, []);

  const resolveBoard = useCallback((newBoard: Board, player: Player) => {
    const result = checkWinner(newBoard);
    if (result) {
      setWinResult(result);
      setGameOver(true);
      setScores((prev) => ({
        ...prev,
        [result.winner]: prev[result.winner] + 1,
      }));
      return true;
    }
    if (checkDraw(newBoard)) {
      setIsDraw(true);
      setGameOver(true);
      setScores((prev) => ({ ...prev, draw: prev.draw + 1 }));
      return true;
    }
    setCurrentPlayer(player === "X" ? "O" : "X");
    return false;
  }, []);

  const handleCellClick = useCallback(
    (index: number) => {
      if (board[index] || gameOver || botThinking) return;
      if (isVsBot && currentPlayer === "O") return;

      const newBoard = applyMove(board, index, currentPlayer);
      setBoard(newBoard);

      const over = resolveBoard(newBoard, currentPlayer);

      if (!over && isVsBot && currentPlayer === "X") {
        setBotThinking(true);
      }
    },
    [
      board,
      currentPlayer,
      gameOver,
      botThinking,
      isVsBot,
      applyMove,
      resolveBoard,
    ],
  );

  // Bot move effect
  useEffect(() => {
    if (!botThinking || gameOver) return;
    const timer = setTimeout(() => {
      const move = getBotMove(board, difficulty);
      if (move === -1) return;
      const newBoard = applyMove(board, move, "O");
      setBoard(newBoard);
      resolveBoard(newBoard, "O");
      setBotThinking(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [botThinking, board, gameOver, difficulty, applyMove, resolveBoard]);

  const handleRestart = useCallback(() => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer("X");
    setGameOver(false);
    setWinResult(null);
    setIsDraw(false);
    setBotThinking(false);
  }, []);

  const handleModeChange = useCallback((mode: GameMode) => {
    setGameMode(mode);
    setBoard(Array(9).fill(null));
    setCurrentPlayer("X");
    setGameOver(false);
    setWinResult(null);
    setIsDraw(false);
    setBotThinking(false);
  }, []);

  const handleDifficultyChange = useCallback((d: Difficulty) => {
    setDifficulty(d);
    setBoard(Array(9).fill(null));
    setCurrentPlayer("X");
    setGameOver(false);
    setWinResult(null);
    setIsDraw(false);
    setBotThinking(false);
  }, []);

  const winningCells = new Set(winResult?.line ?? []);
  const oLabel = isVsBot ? "Bot" : "Player O";
  const statusOLabel = isVsBot ? "Bot" : "Player";
  const boardDisabled = botThinking || gameOver;

  return (
    <div className="min-h-screen bg-background noise-bg flex flex-col items-center justify-between px-4 py-8">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% -10%, oklch(0.68 0.22 25 / 0.12), transparent), radial-gradient(ellipse 50% 35% at 50% 110%, oklch(0.78 0.15 195 / 0.1), transparent)",
        }}
      />

      {/* Header */}
      <header className="w-full max-w-sm flex flex-col items-center gap-2">
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center"
        >
          <h1 className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight leading-none">
            <span className="text-x">TIC</span>
            <span className="text-foreground">·</span>
            <span className="text-o">TAC</span>
            <span className="text-foreground">·</span>
            <span className="text-x">TOE</span>
          </h1>
        </motion.div>

        {/* Mode Selector */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex items-center gap-1 mt-2 bg-card border border-border rounded-xl p-1"
        >
          <button
            type="button"
            data-ocid="mode.2player_button"
            onClick={() => handleModeChange("2player")}
            className={[
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-body font-semibold transition-all duration-200",
              gameMode === "2player"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <Users className="w-3.5 h-3.5" />2 Players
          </button>
          <button
            type="button"
            data-ocid="mode.bot_button"
            onClick={() => handleModeChange("bot")}
            className={[
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-body font-semibold transition-all duration-200",
              gameMode === "bot"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <Bot className="w-3.5 h-3.5" />
            vs Bot
          </button>
        </motion.div>

        {/* Difficulty Selector — only shown in bot mode */}
        <AnimatePresence>
          {isVsBot && (
            <motion.div
              key="difficulty"
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden w-full flex justify-center"
            >
              <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 mt-1">
                {DIFFICULTY_OPTIONS.map(({ label, value, ocid }) => (
                  <button
                    key={value}
                    type="button"
                    data-ocid={ocid}
                    onClick={() => handleDifficultyChange(value)}
                    className={[
                      "px-3 py-1.5 rounded-lg text-sm font-body font-semibold transition-all duration-200",
                      difficulty === value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scoreboard */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="w-full mt-3 grid grid-cols-3 gap-3"
        >
          {(
            [
              { label: "Player X", key: "X" as const, color: "text-x" },
              {
                label: "Draws",
                key: "draw" as const,
                color: "text-muted-foreground",
              },
              { label: oLabel, key: "O" as const, color: "text-o" },
            ] as const
          ).map(({ label, key, color }) => (
            <div
              key={key}
              className="flex flex-col items-center gap-1 bg-card border border-border rounded-xl py-3 px-2"
            >
              <span className={`font-display text-3xl font-extrabold ${color}`}>
                {scores[key]}
              </span>
              <span className="text-muted-foreground text-xs font-body uppercase tracking-wider">
                {label}
              </span>
            </div>
          ))}
        </motion.div>
      </header>

      {/* Game Panel */}
      <main className="w-full max-w-sm flex flex-col items-center gap-5 my-6">
        {/* Status */}
        <motion.div
          data-ocid="game.panel"
          className="w-full flex items-center justify-center gap-2 h-12"
        >
          <AnimatePresence mode="wait">
            {gameOver ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.85, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: -8 }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                className="flex items-center gap-2"
              >
                {isDraw ? (
                  <>
                    <Minus className="w-5 h-5 text-muted-foreground" />
                    <span className="font-display text-xl font-bold text-foreground">
                      It&apos;s a Draw!
                    </span>
                  </>
                ) : (
                  <>
                    <Trophy
                      className={`w-5 h-5 ${
                        winResult?.winner === "X" ? "text-x" : "text-o"
                      }`}
                    />
                    <span
                      className={`font-display text-xl font-bold ${
                        winResult?.winner === "X" ? "text-x" : "text-o"
                      }`}
                    >
                      {winResult?.winner === "O" && isVsBot
                        ? "Bot Wins!"
                        : `Player ${winResult?.winner} Wins!`}
                    </span>
                  </>
                )}
              </motion.div>
            ) : botThinking ? (
              <motion.div
                key="bot-thinking"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Number.POSITIVE_INFINITY,
                    duration: 1,
                    ease: "linear",
                  }}
                >
                  <Bot className="w-5 h-5 text-o" />
                </motion.div>
                <span className="font-body text-muted-foreground text-sm">
                  Bot is thinking…
                </span>
              </motion.div>
            ) : (
              <motion.div
                key={`turn-${currentPlayer}`}
                initial={{ opacity: 0, x: currentPlayer === "X" ? -16 : 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: currentPlayer === "X" ? 16 : -16 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <span className="font-body text-muted-foreground text-sm">
                  {currentPlayer === "O" && isVsBot ? statusOLabel : "Player"}
                </span>
                <span
                  className={`font-display text-2xl font-extrabold ${
                    currentPlayer === "X" ? "text-x" : "text-o"
                  }`}
                >
                  {currentPlayer}
                </span>
                <span className="font-body text-muted-foreground text-sm">
                  &apos;s Turn
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Board */}
        <motion.div
          data-ocid="board.canvas_target"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.4, ease: "easeOut" }}
          className="w-full grid grid-cols-3 gap-3"
        >
          {CELL_POSITIONS.map((pos) => (
            <CellButton
              key={CELL_IDS[pos]}
              value={board[pos]}
              index={pos}
              onClick={() => handleCellClick(pos)}
              isWinning={winningCells.has(pos)}
              disabled={
                (boardDisabled && !winningCells.has(pos)) ||
                (isVsBot && currentPlayer === "O" && !gameOver)
              }
            />
          ))}
        </motion.div>

        {/* Restart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="w-full"
        >
          <Button
            data-ocid="game.restart_button"
            onClick={handleRestart}
            variant="outline"
            className="w-full gap-2 font-display font-bold tracking-wide border-border text-foreground hover:border-primary hover:text-primary hover:bg-primary/10 transition-all duration-200"
            size="lg"
          >
            <RotateCcw className="w-4 h-4" />
            New Game
          </Button>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="text-center">
        <p className="text-muted-foreground text-xs font-body">
          © {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
