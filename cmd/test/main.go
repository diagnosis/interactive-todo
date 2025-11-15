package main

import (
	"fmt"
	"os"

	_ "github.com/joho/godotenv/autoload"
)

func main() {
	appEnv := os.Getenv("APP_ENV")
	fmt.Println(appEnv)

}
