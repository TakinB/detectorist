import React, { useState, useEffect, useRef } from "react";
import { Target, Volume2, VolumeX } from "lucide-react";

const HotColdGame = () => {
  const [target, setTarget] = useState({ x: 0, y: 0 });
  const [lastDistance, setLastDistance] = useState(null);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [foundTarget, setFoundTarget] = useState(false);

  const audioContextRef = useRef(null);
  const oscillatorsRef = useRef([]);
  const gainNodesRef = useRef([]);

  const celebrationEmojis = [
    "🎉",
    "🎈",
    "🎊",
    "⭐",
    "🌟",
    "💫",
    "🏆",
    "🥳",
    "🪄",
    "✨",
  ];
  const [currentEmoji, setCurrentEmoji] = useState("");

  const celebrationMessages = [
    "Amazing find!",
    "You're a natural!",
    "Outstanding work!",
    "Spectacular!",
    "You found it!",
    "Brilliant work!",
    "What a discovery!",
    "Great job!",
  ];
  const [currentMessage, setCurrentMessage] = useState("");

  const createMusicalNote = (ctx, frequency) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(0.1, ctx.currentTime, 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    return { oscillator: osc, gain };
  };

  useEffect(() => {
    if (gameStarted && !isMuted && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
      const baseFreq = 220;
      const frequencies = [
        baseFreq,
        baseFreq * 1.25,
        baseFreq * 1.5,
        baseFreq * 2,
      ];

      frequencies.forEach((freq) => {
        const { oscillator, gain } = createMusicalNote(
          audioContextRef.current,
          freq
        );
        oscillatorsRef.current.push(oscillator);
        gainNodesRef.current.push(gain);
        oscillator.start();
      });
    }

    return () => {
      if (oscillatorsRef.current.length) {
        oscillatorsRef.current.forEach((osc) => osc.stop());
        oscillatorsRef.current = [];
        gainNodesRef.current = [];
        audioContextRef.current = null;
      }
    };
  }, [gameStarted, isMuted]);

  useEffect(() => {
    if (gameStarted) {
      setTarget({
        x: Math.floor(Math.random() * 80) + 10,
        y: Math.floor(Math.random() * 80) + 10,
      });
    }
  }, [gameStarted]);

  const getDistance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };

  const updateMusicalNotes = (distance) => {
    if (!audioContextRef.current || oscillatorsRef.current.length === 0) return;
    const proximity = 1 - distance / 100;
    const baseFreq = 220 + 880 * proximity;

    oscillatorsRef.current.forEach((osc, index) => {
      const multiplier = [1, 1.25, 1.5, 2][index];
      const freq = baseFreq * multiplier;
      osc.frequency.setTargetAtTime(
        freq,
        audioContextRef.current.currentTime,
        0.1
      );
      const gain = gainNodesRef.current[index];
      gain.gain.setTargetAtTime(
        0.1 * proximity,
        audioContextRef.current.currentTime,
        0.1
      );
    });
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (oscillatorsRef.current.length) {
      oscillatorsRef.current.forEach((osc) => osc.stop());
      oscillatorsRef.current = [];
      gainNodesRef.current = [];
      audioContextRef.current = null;
    }
  };

  const handleMouseMove = (e) => {
    if (!gameStarted || foundTarget) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const distance = getDistance(x, y, target.x, target.y);
    setLastDistance(distance);

    if (!isMuted) {
      updateMusicalNotes(distance);
    }

    if (distance < 5) {
      setCurrentEmoji(
        celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)]
      );
      setCurrentMessage(
        celebrationMessages[
          Math.floor(Math.random() * celebrationMessages.length)
        ]
      );
      setFoundTarget(true);
      setScore((prevScore) => prevScore + 1);

      if (oscillatorsRef.current.length) {
        oscillatorsRef.current.forEach((osc) => osc.stop());
        oscillatorsRef.current = [];
        gainNodesRef.current = [];
        audioContextRef.current = null;
      }

      setTimeout(() => {
        setGameStarted(false);
        setFoundTarget(false);
      }, 2000);
    }
  };

  const getFeedback = () => {
    if (foundTarget) return "bg-white";
    if (!lastDistance) return "bg-gray-100";
    if (lastDistance < 10) return "bg-red-500";
    if (lastDistance < 20) return "bg-orange-500";
    if (lastDistance < 30) return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 text-white p-4 flex justify-between items-center">
        <h2 className="text-xl font-bold">Detectorist</h2>
        <div className="flex items-center gap-4">
          <p className="font-medium">Score: {score}</p>
          <button
            onClick={toggleMute}
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
            aria-label={isMuted ? "Unmute sound" : "Mute sound"}
          >
            {isMuted ? (
              <VolumeX className="text-white" />
            ) : (
              <Volume2 className="text-white" />
            )}
          </button>
        </div>
      </div>

      <div
        className={`flex-1 w-full cursor-crosshair transition-colors duration-200 ${getFeedback()}`}
        onMouseMove={handleMouseMove}
        role="application"
        aria-label="Game area. Move cursor to find treasure. Background color and musical notes indicate proximity."
      >
        {!gameStarted && !foundTarget && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <button
              onClick={() => setGameStarted(true)}
              className="bg-white text-black px-6 py-3 rounded-lg text-lg font-medium
                       hover:bg-opacity-90 transition-all duration-200 shadow-lg"
            >
              {score === 0 ? "Start Game" : "Play Again"}
            </button>
            <p className="mt-4 text-black font-medium">
              Move your cursor to find the hidden treasure!
              <br />
              Music gets higher and louder as you get closer!
            </p>
          </div>
        )}

        {gameStarted && !foundTarget && (
          <Target className="absolute top-6 right-6 text-white animate-pulse" />
        )}

        {foundTarget && (
          <div
            className="absolute transition-opacity duration-500"
            style={{
              left: `${target.x}%`,
              top: `${target.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="text-6xl animate-bounce">{currentEmoji}</div>
            <div className="text-xl font-bold text-black mt-4 animate-fade-in">
              {currentMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotColdGame;
