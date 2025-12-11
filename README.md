# Categorias (site)

Site estático simples que lê arquivos JSON em `data/` e mostra por categoria em grid, com paginação e busca.

Como usar localmente

1. No diretório `r-library/`, inicie um servidor HTTP simples:

```
cd r-library
python3 -m http.server 8000
```

2. Abra `http://localhost:8000` no navegador.

Publicar no GitHub Pages

- Se este repositório contiver apenas a pasta `r-library/`, basta comitar e empurrar para o GitHub e ativar GitHub Pages na branch `main` com a pasta `/ (root)`.
- Alternativamente, crie um repositório com o conteúdo de `r-library/` e use a ação `pages` ou branch `gh-pages`.

Usando MkDocs (nova versão)

1. Gere o bundle de dados (cria `docs/assets/js/data-bundle.js`):

```bash
cd r-library
python3 generate_bundle.py
```

2. Instale e rode MkDocs localmente (recomendado usar um virtualenv):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install mkdocs
mkdocs serve
```

3. Abra `http://127.0.0.1:8000` e navegue pelo site.

4. Para gerar site estático pronto para GitHub Pages:

```bash
mkdocs build
```

O diretório `r-library/` gerado pode ser publicado no GitHub Pages.

Notas

- O frontend busca `data/manifest.json` para descobrir quais arquivos JSON carregar. Atualize `data/manifest.json` se adicionar/remo ver arquivos.
- Os arquivos JSON devem ser arrays de objetos contendo `title` e `cover`.
