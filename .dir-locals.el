;;; Directory Local Variables
;;; For more information see (info "(emacs) Directory Variables")

((python-mode
  (eval . (setq-local python-shell-virtualenv-root (concat default-directory "venv")))
  (python-shell-interpreter . "python3")))
