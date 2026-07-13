use serde::Serialize;
use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
    time::UNIX_EPOCH,
};

const MAX_RECENT_DOCUMENTS: usize = 10;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentDocument {
    pub path: String,
    pub name: String,
    pub modified_millis: u64,
}

pub struct RecentDocuments {
    storage_path: PathBuf,
    paths: Mutex<Vec<PathBuf>>,
}

impl RecentDocuments {
    pub fn load(storage_path: PathBuf) -> Self {
        let mut seen = HashSet::new();
        let paths = fs::read_to_string(&storage_path)
            .unwrap_or_default()
            .lines()
            .map(PathBuf::from)
            .filter(|path| path.is_file() && seen.insert(path.clone()))
            .take(MAX_RECENT_DOCUMENTS)
            .collect();

        Self {
            storage_path,
            paths: Mutex::new(paths),
        }
    }

    pub fn record(&self, path: &Path) {
        let Ok(mut paths) = self.paths.lock() else {
            return;
        };
        paths.retain(|recent| recent != path);
        paths.insert(0, path.to_path_buf());
        paths.truncate(MAX_RECENT_DOCUMENTS);
        self.persist(&paths);
    }

    pub fn contains(&self, path: &Path) -> bool {
        self.paths
            .lock()
            .map(|paths| paths.iter().any(|recent| recent == path))
            .unwrap_or(false)
    }

    pub fn list(&self) -> Vec<RecentDocument> {
        let Ok(mut paths) = self.paths.lock() else {
            return Vec::new();
        };
        paths.retain(|path| path.is_file());
        self.persist(&paths);

        paths
            .iter()
            .filter_map(|path| {
                let metadata = fs::metadata(path).ok()?;
                let name = path.file_name()?.to_str()?.to_string();
                let modified_millis = metadata
                    .modified()
                    .ok()
                    .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
                    .map(|duration| duration.as_millis() as u64)
                    .unwrap_or_default();
                Some(RecentDocument {
                    path: path.to_string_lossy().into_owned(),
                    name,
                    modified_millis,
                })
            })
            .collect()
    }

    fn persist(&self, paths: &[PathBuf]) {
        if let Some(parent) = self.storage_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let content = paths
            .iter()
            .map(|path| path.to_string_lossy())
            .collect::<Vec<_>>()
            .join("\n");
        let _ = fs::write(&self.storage_path, content);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn test_directory() -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("horloge valide")
            .as_nanos();
        std::env::temp_dir().join(format!("plum3-recents-{suffix}"))
    }

    #[test]
    fn conserve_le_plus_recent_en_premier() {
        let directory = test_directory();
        fs::create_dir_all(&directory).expect("dossier créé");
        let first = directory.join("premier.md");
        let second = directory.join("second.txt");
        fs::write(&first, "premier").expect("fixture créée");
        fs::write(&second, "second").expect("fixture créée");
        let history_path = directory.join("recent-documents.txt");
        let recent = RecentDocuments::load(history_path.clone());

        recent.record(&first);
        recent.record(&second);
        recent.record(&first);

        let documents = recent.list();
        assert_eq!(documents.len(), 2);
        assert_eq!(documents[0].name, "premier.md");
        assert_eq!(documents[1].name, "second.txt");

        let reloaded = RecentDocuments::load(history_path);
        assert!(reloaded.contains(&first));
        let _ = fs::remove_dir_all(directory);
    }
}
