{
  description = "Entorno de desarrollo de la web de la Parroquia San Isidro Labrador";

  # Canal fijado para que el entorno sea reproducible.
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/26.05";

  outputs = {
    self,
    nixpkgs,
  }: let
    systems = [
      "x86_64-linux"
      "aarch64-linux"
      "x86_64-darwin"
      "aarch64-darwin"
    ];

    forEachSystem = f:
      nixpkgs.lib.genAttrs systems (system: f (import nixpkgs {inherit system;}));
  in {
    devShells = forEachSystem (pkgs: {
      default = pkgs.mkShell {
        packages = with pkgs; [
          # Runtime principal: instalar dependencias y ejecutar el generador.
          bun

          # Compatibilidad con los scripts npm existentes y ejecución directa.
          nodejs

          # Servidor local, control de versiones y gestión de issues.
          python3
          git
          gh

          # Utilidades para scripts y depuración.
          jq
          ripgrep
        ];

        shellHook = ''
          echo "Devshell listo · bun $(bun --version) · node $(node --version)"
          echo "  bun install              instalar dependencias"
          echo "  nix run .#dev            servir en http://localhost:8080"
          echo "  nix run .#generate       regenerar el Evangelio"
          if [ ! -d node_modules ]; then
            echo "Aviso: falta node_modules. Ejecuta 'bun install'."
          fi
        '';
      };
    });

    apps = forEachSystem (pkgs: {
      # Servidor estático para desarrollo.
      dev = {
        type = "app";
        program = "${pkgs.writeShellScript "serve-parroquia" ''
          exec ${pkgs.python3}/bin/python3 -m http.server "''${PORT:-8080}"
        ''}";
      };

      # Generador de lecturas litúrgicas. Los argumentos se pasan tal cual:
      #   nix run .#generate -- --from=2026 --to=2040
      generate = {
        type = "app";
        program = "${pkgs.writeShellScript "generate-gospel" ''
          exec ${pkgs.bun}/bin/bun run ${self}/scripts/generate-gospel.mjs "$@"
        ''}";
      };
    });
  };
}
