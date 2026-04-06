import { useEffect, useState } from "react";
import { Telescope, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

const NASA_KEY = "opzhq4SjSKyje1q0JqjgajekWW7OahVvKqvNItZe";

interface NasaApod {
    title: string;
    explanation: string;
    url: string;
    hdurl?: string;
    media_type: string;
    date: string;
    copyright?: string;
    thumbnail_url?: string;
}

// جلب آخر N أيام حتى نجد صورة (ليس فيديو)
async function fetchApodImage(daysBack = 0): Promise<NasaApod | null> {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const res = await fetch(
        `https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}&date=${dateStr}&thumbs=true`
    );
    if (!res.ok) return null;
    const data: NasaApod = await res.json();
    return data;
}

function useNasaApod() {
    const [data, setData] = useState<NasaApod | null>(null);
    const [loading, setLoading] = useState(true);
    const [daysBack, setDaysBack] = useState(0);

    const loadApod = async (days: number) => {
        setLoading(true);
        try {
            // جرب اليوم أولاً، إذا فيديو بدون thumbnail جرب أمس
            let apod = await fetchApodImage(days);
            if (!apod) { setLoading(false); return; }

            // إذا فيديو وما عنده thumbnail، جرب اليوم التالي في القائمة
            if (apod.media_type === "video" && !apod.thumbnail_url) {
                const fallback = await fetchApodImage(days + 1);
                if (fallback) apod = fallback;
            }

            setData(apod);
            setDaysBack(days);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadApod(0); }, []);

    const goNext = () => { if (daysBack > 0) loadApod(daysBack - 1); };
    const goPrev = () => { loadApod(daysBack + 1); };

    return { data, loading, daysBack, goNext, goPrev };
}

// استخرج YouTube video ID
function getYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}

export default function NasaApodSection() {
    const { data, loading, daysBack, goNext, goPrev } = useNasaApod();

    // حدد الصورة المعروضة
    const displayImage =
        data?.media_type === "image"
            ? (data.hdurl || data.url)
            : data?.thumbnail_url || null;

    const youtubeId = data?.media_type === "video" ? getYouTubeId(data.url) : null;

    return (
        <section className="py-20 bg-slate-950 overflow-hidden">
            <div className="container">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 bg-indigo-900/40 border border-indigo-700/50 rounded-full px-4 py-1.5 mb-5">
                        <Telescope size={13} className="text-indigo-400" />
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-300">
                            NASA • Astronomy Picture of the Day
                        </span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-3">
                        Today's View From Space
                    </h2>
                    <p className="text-slate-400 font-medium text-sm max-w-xl mx-auto">
                        Every day NASA shares a stunning image of our universe — a reminder of how precious our planet truly is.
                    </p>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="max-w-5xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden animate-pulse">
                        <div className="h-80 bg-slate-800" />
                        <div className="p-8 space-y-3">
                            <div className="h-6 bg-slate-800 rounded w-1/2" />
                            <div className="h-4 bg-slate-800 rounded w-full" />
                            <div className="h-4 bg-slate-800 rounded w-4/5" />
                        </div>
                    </div>
                ) : data ? (
                    <div className="max-w-5xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
                        <div className="md:grid md:grid-cols-2">

                            {/* Media — صورة أو فيديو YouTube */}
                            <div className="relative overflow-hidden h-72 md:h-auto min-h-[288px] bg-slate-800">
                                {data.media_type === "video" && youtubeId ? (
                                    // عرض الفيديو embed
                                    <iframe
                                        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0`}
                                        title={data.title}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="w-full h-full absolute inset-0"
                                        style={{ border: "none" }}
                                    />
                                ) : displayImage ? (
                                    <img
                                        src={displayImage}
                                        alt={data.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Telescope size={48} className="text-slate-600" />
                                    </div>
                                )}
                                {/* Gradient overlay على الصور فقط */}
                                {data.media_type === "image" && (
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent md:bg-gradient-to-r pointer-events-none" />
                                )}
                            </div>

                            {/* Text */}
                            <div className="p-8 flex flex-col justify-between gap-4">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-black uppercase tracking-widest text-indigo-400 bg-indigo-900/30 border border-indigo-800/40 rounded-full px-3 py-1">
                                            {new Date(data.date).toLocaleDateString("en-US", {
                                                month: "long",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </span>
                                        {data.media_type === "video" && (
                                            <span className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-900/30 border border-amber-800/40 rounded-full px-3 py-1">
                                                🎬 Video
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-2xl font-black text-white leading-tight">{data.title}</h3>

                                    <p className="text-slate-400 text-sm font-medium leading-relaxed line-clamp-6">
                                        {data.explanation}
                                    </p>

                                    {data.copyright && (
                                        <p className="text-xs text-slate-600 font-medium">© {data.copyright.trim()}</p>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="space-y-3">
                                    <a
                                        href={data.hdurl || data.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                                    >
                                        <ExternalLink size={12} />
                                        {data.media_type === "video" ? "Watch on YouTube" : "View Full Resolution"}
                                    </a>

                                    {/* Navigation بين الأيام */}
                                    <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                                        <button
                                            onClick={goPrev}
                                            className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 rounded-xl px-3 py-2"
                                        >
                                            <ChevronLeft size={14} /> Previous Day
                                        </button>
                                        {daysBack > 0 && (
                                            <button
                                                onClick={goNext}
                                                className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 rounded-xl px-3 py-2"
                                            >
                                                Next Day <ChevronRight size={14} />
                                            </button>
                                        )}
                                        {daysBack > 0 && (
                                            <span className="text-xs text-slate-600 font-medium ml-auto">
                                                {daysBack} day{daysBack > 1 ? "s" : ""} ago
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Fallback إذا فشل الـ API كلياً
                    <div className="max-w-5xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 p-12 text-center">
                        <Telescope size={48} className="mx-auto text-slate-700 mb-4" />
                        <p className="text-slate-500 font-medium">NASA APOD data unavailable at the moment.</p>
                        <a
                            href="https://apod.nasa.gov"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors mt-4"
                        >
                            <ExternalLink size={12} /> Visit NASA APOD
                        </a>
                    </div>
                )}

                {/* Data source note */}
                <p className="text-center text-xs text-slate-700 font-medium mt-6">
                    Data provided by NASA Open APIs • Updates daily
                </p>
            </div>
        </section>
    );
}