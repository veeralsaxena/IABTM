"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Video, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type FeedPost = {
  id: string;
  body: string;
  media_url: string | null;
  media_kind: string | null;
  created_at: string;
  user_id: string;
  author_name?: string | null;
  author_avatar?: string | null;
  is_mine?: boolean;
};

export function PostComposer({
  name,
  avatarUrl,
  onPosted,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  onPosted: (post: FeedPost) => void;
}) {
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<"photo" | "video" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickFile(f: File | null, k: "photo" | "video") {
    if (!f) return;
    setFile(f);
    setKind(k);
    setPreview(URL.createObjectURL(f));
  }

  function clearMedia() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setKind(null);
    setPreview(null);
  }

  async function submit() {
    if (!body.trim() && !file) return;
    setBusy(true);
    setError(null);
    try {
      let mediaUrl: string | null = null;
      if (file && kind) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not signed in");
        const ext = file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg");
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("post-media")
          .upload(path, file, { upsert: false });
        if (upErr) throw new Error(upErr.message);
        const { data } = supabase.storage.from("post-media").getPublicUrl(path);
        mediaUrl = data.publicUrl;
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          mediaUrl,
          mediaKind: kind,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to post");
      onPosted(json.post);
      setBody("");
      clearMedia();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-200">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-500">
              {(name || "Y").slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Start a post — what’s shifting on your path?"
            className="w-full resize-none border-0 bg-transparent text-sm leading-relaxed text-zinc-800 outline-none placeholder:text-zinc-400"
          />

          {preview && (
            <div className="relative mt-2 overflow-hidden rounded-xl border border-zinc-200">
              <button
                type="button"
                onClick={clearMedia}
                className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1 text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {kind === "video" ? (
                <video src={preview} controls className="max-h-64 w-full bg-black" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="max-h-64 w-full object-cover" />
              )}
            </div>
          )}

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
            <div className="flex gap-1">
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  pickFile(e.target.files?.[0] ?? null, "photo")
                }
              />
              <input
                ref={videoRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) =>
                  pickFile(e.target.files?.[0] ?? null, "video")
                }
              />
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
              >
                <ImagePlus className="h-4 w-4" />
                Photo
              </button>
              <button
                type="button"
                onClick={() => videoRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
              >
                <Video className="h-4 w-4" />
                Video
              </button>
            </div>
            <button
              type="button"
              disabled={busy || (!body.trim() && !file)}
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostCard({
  post,
  onDelete,
}: {
  post: FeedPost;
  onDelete?: (id: string) => void;
}) {
  const when = new Date(post.created_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-200">
          {post.author_avatar ? (
            <Image
              src={post.author_avatar}
              alt=""
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-500">
              {(post.author_name || "Y").slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold">
              {post.author_name || "Member"}
            </span>
            <span className="text-xs text-zinc-400">{when}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
            {post.body}
          </p>
          {post.media_url && (
            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-100">
              {post.media_kind === "video" ? (
                <video
                  src={post.media_url}
                  controls
                  className="max-h-80 w-full bg-black"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.media_url}
                  alt=""
                  className="max-h-80 w-full object-cover"
                />
              )}
            </div>
          )}
          {post.is_mine && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(post.id)}
              className="mt-3 text-xs text-zinc-400 hover:text-red-600"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
