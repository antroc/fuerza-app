import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ImageOff, Search, Star, X } from "lucide-react";
import { filterExercises } from "../../catalog/search";
import { gifLoadQueue } from "../../catalog/mediaQueue";
import type { CatalogExercise } from "../../catalog/types";
import type { ExerciseCategory } from "../../domain/types";

interface ExercisePickerProps {
  exercises: CatalogExercise[];
  favorites: Set<string>;
  reducedMotion: boolean;
  onSelect: (exercise: CatalogExercise) => void;
  onToggleFavorite: (exerciseId: string, favorite: boolean) => void;
  onClose: () => void;
}

const categories: ExerciseCategory[] = ["Pecho", "Espalda", "Hombros", "Brazos", "Piernas", "Core"];

const ExerciseMedia = ({
  exercise,
  reducedMotion,
}: {
  exercise: CatalogExercise;
  reducedMotion: boolean;
}) => {
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loadGif, setLoadGif] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const releaseRef = useRef<(() => void) | null>(null);
  const usesStaticMedia = reducedMotion || !exercise.gifUrl;

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "120px",
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (usesStaticMedia || !visible) {
      setLoadGif(false);
      releaseRef.current?.();
      releaseRef.current = null;
      return;
    }
    let cancelled = false;
    void gifLoadQueue.acquire().then((release) => {
      if (cancelled) return release();
      releaseRef.current = release;
      setLoadGif(true);
    });
    return () => {
      cancelled = true;
      releaseRef.current?.();
      releaseRef.current = null;
    };
  }, [usesStaticMedia, visible]);

  const completeRequest = () => {
    releaseRef.current?.();
    releaseRef.current = null;
  };

  const mediaUrl = usesStaticMedia ? exercise.imageUrl : exercise.gifUrl;

  if (failed || !mediaUrl) {
    return (
      <div ref={containerRef} className="media-fallback">
        <ImageOff aria-hidden="true" />
        <span>Vista no disponible</span>
      </div>
    );
  }
  return (
    <div ref={containerRef} className="exercise-media">
      {(usesStaticMedia ? visible : loadGif) ? (
        <img
          src={mediaUrl}
          alt={`Demostración de ${exercise.name}`}
          loading="lazy"
          decoding="async"
          onLoad={completeRequest}
          onError={() => {
            completeRequest();
            setFailed(true);
          }}
        />
      ) : (
        <span className="media-placeholder" aria-hidden="true" />
      )}
    </div>
  );
};

interface ExerciseResultProps {
  exercise: CatalogExercise;
  favorite: boolean;
  reducedMotion: boolean;
  onSelect: (exercise: CatalogExercise) => void;
  onToggleFavorite: (exerciseId: string, favorite: boolean) => void;
}

const ExerciseResult = ({
  exercise,
  favorite,
  reducedMotion,
  onSelect,
  onToggleFavorite,
}: ExerciseResultProps) => (
  <article className="exercise-result">
    <button
      className="exercise-media-button"
      onClick={() => onSelect(exercise)}
      aria-label={`Añadir ${exercise.name}`}
    >
      <ExerciseMedia exercise={exercise} reducedMotion={reducedMotion} />
      <span className="exercise-result-copy">
        <strong>{exercise.name}</strong>
        <span>
          {exercise.equipment} · {exercise.target}
        </span>
        <small>{exercise.attribution}</small>
      </span>
    </button>
    <button
      className="favorite-button"
      onClick={() => onToggleFavorite(exercise.id, !favorite)}
      aria-label={`${favorite ? "Quitar" : "Añadir"} ${exercise.name} ${favorite ? "de" : "a"} favoritos`}
    >
      <Star fill={favorite ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  </article>
);

export const ExercisePicker = ({
  exercises,
  favorites,
  reducedMotion,
  onSelect,
  onToggleFavorite,
  onClose,
}: ExercisePickerProps) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ExerciseCategory | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [limit, setLimit] = useState(18);
  const results = useMemo(
    () =>
      filterExercises(exercises, {
        query,
        category,
        favorites,
        limit: favoritesOnly ? exercises.length : limit,
      }).filter((exercise) => !favoritesOnly || favorites.has(exercise.id)),
    [category, exercises, favorites, favoritesOnly, limit, query],
  );
  const favoriteGroups = useMemo(
    () =>
      categories
        .map((group) => ({
          category: group,
          exercises: results.filter((exercise) => exercise.category === group),
        }))
        .filter((group) => group.exercises.length > 0),
    [results],
  );

  return (
    <div className="picker-backdrop">
      <section
        className="exercise-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
      >
        <header>
          <button className="icon-button" onClick={onClose} aria-label="Volver al entrenamiento">
            <ArrowLeft />
          </button>
          <div>
            <h1 id="picker-title">Añadir ejercicio</h1>
            <p>{results.length} resultados visibles</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar selector">
            <X />
          </button>
        </header>
        <label className="search-field">
          <Search aria-hidden="true" />
          <span className="sr-only">Buscar ejercicio</span>
          <input
            type="search"
            aria-label="Buscar ejercicio"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre"
          />
        </label>
        <div className="filter-row" aria-label="Filtros de ejercicios">
          <button
            className={favoritesOnly ? "is-selected" : ""}
            onClick={() => {
              setFavoritesOnly(!favoritesOnly);
              setCategory(null);
            }}
          >
            <Star size={17} fill={favoritesOnly ? "currentColor" : "none"} /> Favoritos
          </button>
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? "is-selected" : ""}
              onClick={() => {
                setCategory(category === item ? null : item);
                setFavoritesOnly(false);
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="catalog-results">
          {favoritesOnly
            ? favoriteGroups.map((group) => (
                <section className="favorite-group" key={group.category}>
                  <h2>
                    {group.category}
                    <span
                      aria-label={`${group.exercises.length} ${group.exercises.length === 1 ? "ejercicio" : "ejercicios"}`}
                    >
                      {group.exercises.length}
                    </span>
                  </h2>
                  {group.exercises.map((exercise) => (
                    <ExerciseResult
                      key={exercise.id}
                      exercise={exercise}
                      favorite
                      reducedMotion={reducedMotion}
                      onSelect={onSelect}
                      onToggleFavorite={onToggleFavorite}
                    />
                  ))}
                </section>
              ))
            : results.map((exercise) => (
                <ExerciseResult
                  key={exercise.id}
                  exercise={exercise}
                  favorite={favorites.has(exercise.id)}
                  reducedMotion={reducedMotion}
                  onSelect={onSelect}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
          {results.length === 0 && (
            <div className="empty-state">
              <Search aria-hidden="true" />
              <h2>No encontramos ejercicios</h2>
              <p>Prueba otra búsqueda o elimina algún filtro.</p>
            </div>
          )}
        </div>
        {!favoritesOnly && results.length >= limit && (
          <button
            className="button button-secondary load-more"
            onClick={() => setLimit((value) => value + 18)}
          >
            Mostrar más
          </button>
        )}
      </section>
    </div>
  );
};
