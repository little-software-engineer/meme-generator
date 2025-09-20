import React, { useState, useRef, useEffect } from "react";
import { auth, provider, db, storage } from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./App.css";
import {
  LogIn,
  LogOut,
  ImagePlus,
  Download,
  Save,
} from "lucide-react";

function App() {
  const [user, setUser] = useState(null);
  const [image, setImage] = useState(null);
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [fontSize, setFontSize] = useState(40);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [textColor, setTextColor] = useState("white");
  const canvasRef = useRef(null);
  const previewRef = useRef(null);

  //  Google Sign In
  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (err) {
      console.error("Error signing in:", err);
    }
  };

  //  Sign Out
  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
  };


  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };


  const drawMeme = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const containerWidth = previewRef.current?.clientWidth || 800;
    const maxViewportHeight = Math.max(240, window.innerHeight - 260);

    if (!image) {

      const baseW = 800;
      const baseH = 600;
      const scale = Math.min(1, containerWidth / baseW, maxViewportHeight / baseH);
      const width = Math.floor(baseW * scale);
      const height = Math.floor(baseH * scale);
      canvas.width = width;
      canvas.height = height;

      ctx.fillStyle = "#222";
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.textAlign = "center";
      ctx.lineWidth = strokeWidth;
      ctx.font = `${fontSize}px Impact`;
      ctx.fillStyle = textColor === "white" ? "white" : "black";
      ctx.strokeStyle = textColor === "white" ? "black" : "white";
      const topY = Math.max(fontSize + 10, 20);
      const bottomY = Math.max(height - 30, topY + fontSize + 10);
      ctx.fillText(topText.toUpperCase() || "GORNJI TEKST", width / 2, topY);
      ctx.strokeText(topText.toUpperCase() || "GORNJI TEKST", width / 2, topY);
      ctx.fillText(bottomText.toUpperCase() || "DONJI TEKST", width / 2, bottomY);
      ctx.strokeText(bottomText.toUpperCase() || "DONJI TEKST", width / 2, bottomY);
      return;
    }

    const img = new Image();
    img.src = image;
    img.onload = () => {

      const scale = Math.min(1, containerWidth / img.width, maxViewportHeight / img.height);
      const targetW = Math.floor(img.width * scale);
      const targetH = Math.floor(img.height * scale);
      canvas.width = targetW;
      canvas.height = targetH;

      ctx.drawImage(img, 0, 0, targetW, targetH);


      ctx.textAlign = "center";
      ctx.lineWidth = strokeWidth;
      ctx.font = `${fontSize}px Impact`;
      ctx.fillStyle = textColor === "white" ? "white" : "black";
      ctx.strokeStyle = textColor === "white" ? "black" : "white";

      const topY = Math.max(fontSize + 10, 20);
      ctx.fillText(topText.toUpperCase(), canvas.width / 2, topY);
      ctx.strokeText(topText.toUpperCase(), canvas.width / 2, topY);


      const bottomY = Math.max(canvas.height - 20, topY + fontSize + 10);
      ctx.fillText(bottomText.toUpperCase(), canvas.width / 2, bottomY);
      ctx.strokeText(bottomText.toUpperCase(), canvas.width / 2, bottomY);
    };
  };


  useEffect(() => {
    drawMeme();

  }, [image, topText, bottomText, fontSize, strokeWidth]);


  useEffect(() => {
    const onResize = () => drawMeme();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);

  }, []);


  const handleDownload = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = "meme.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };


  const handleSave = async () => {
    if (!user) {
      alert("Sign in first!");
      return;
    }

    const canvas = canvasRef.current;
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      try {
        const fileRef = ref(
          storage,
          `memes/${user.uid}/${Date.now()}.png`
        );
        await uploadBytes(fileRef, blob);
        const downloadURL = await getDownloadURL(fileRef);

        await addDoc(collection(db, "memes"), {
          url: downloadURL,
          ownerUid: user.uid,
          createdAt: serverTimestamp(),
        });

        alert("Meme saved!");
      } catch (err) {
        console.error("Error saving meme:", err);
      }
    });
  };

  return (
    <div className="App bg-spotifyBlack text-white min-h-screen px-4 py-6">
      <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo192.png" alt="logo" className="w-8 h-8 rounded" />
          <h1 className="text-2xl font-semibold tracking-tight text-spotifyGreen">
            Meme Generator
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {!user ? (
            <button
              onClick={handleSignIn}
              className="inline-flex items-center gap-2 bg-spotifyGreen text-white font-semibold px-4 py-2 rounded-md hover:brightness-110 active:brightness-95 transition"
            >
              <LogIn className="w-4 h-4" /> Sign in with Google
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-white/80 hidden sm:inline">{user.displayName}</span>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 bg-spotifyGray text-white font-semibold px-4 py-2 rounded-md hover:bg-white/10 active:bg-white/20 transition"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1 bg-[#1b1b1b] rounded-xl border border-white/10 p-4 lg:sticky lg:top-6 h-fit">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <ImagePlus className="w-4 h-4" /> Učitavanje i tekst
          </h2>

          <label className="block">
            <span className="text-sm text-white/70">Slika</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="mt-1 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-spotifyGreen file:text-white hover:file:brightness-110"
            />
          </label>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm text-white/70">Gornji tekst</label>
              <input
                type="text"
                placeholder="Top text"
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                className="mt-1 w-full rounded-md bg-spotifyGray/60 border border-white/10 px-3 py-2 outline-none focus:border-spotifyGreen"
              />
            </div>
            <div>
              <label className="text-sm text-white/70">Boja teksta</label>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTextColor("white")}
                  className={`px-3 py-1 rounded-md border text-sm ${textColor === "white"
                    ? "bg-spotifyGreen text-white border-transparent"
                    : "bg-spotifyGray/60 text-white/90 border-white/10 hover:bg-white/10"
                    }`}
                >
                  Belo
                </button>
                <button
                  type="button"
                  onClick={() => setTextColor("black")}
                  className={`px-3 py-1 rounded-md border text-sm ${textColor === "black"
                    ? "bg-spotifyGreen text-white border-transparent"
                    : "bg-spotifyGray/60 text-white/90 border-white/10 hover:bg-white/10"
                    }`}
                >
                  Crno
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm text-white/70">Donji tekst</label>
              <input
                type="text"
                placeholder="Bottom text"
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                className="mt-1 w-full rounded-md bg-spotifyGray/60 border border-white/10 px-3 py-2 outline-none focus:border-spotifyGreen"
              />
            </div>
            <div className="pt-2">
              <div className="flex items-center justify-between text-sm text-white/70">
                <label>Veličina fonta</label>
                <span className="text-white/60">{fontSize}px</span>
              </div>
              <input
                type="range"
                min="18"
                max="120"
                step="1"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full mt-2 accent-spotifyGreen"
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm text-white/70">
                <label>Debljina ivice</label>
                <span className="text-white/60">{strokeWidth}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-full mt-2 accent-spotifyGreen"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 bg-spotifyGray text-white font-semibold px-4 py-2 rounded-md hover:bg-white/10 active:bg-white/20 transition"
            >
              <Download className="w-4 h-4" /> Preuzmi
            </button>

            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 bg-spotifyGray text-white font-semibold px-4 py-2 rounded-md hover:bg-white/10 active:bg-white/20 transition"
            >
              <Save className="w-4 h-4" /> Sačuvaj
            </button>
          </div>

          <p className="mt-3 text-xs text-white/60">Prikaz se osvežava automatski.</p>
        </section>

        <section className="lg:col-span-2 bg-[#1b1b1b] rounded-xl border border-white/10 p-4">
          <h2 className="text-lg font-medium mb-4">Pregled</h2>
          <div ref={previewRef} className="relative w-full">
            <canvas
              ref={canvasRef}
              className="mt-2 w-full border-2 border-spotifyGray/70 rounded-md shadow-md block"
            ></canvas>
          </div>
        </section>
      </main>
      <footer className="max-w-6xl mx-auto mt-8 text-center text-xs text-white/50">
        made by <a href="https://github.com/little-software-engineer" target="_blank" rel="noreferrer" className="text-spotifyGreen hover:underline">little-software-engineer</a>
      </footer>
    </div>
  );
}

export default App;
