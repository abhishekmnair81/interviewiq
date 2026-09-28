import os
import django
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.base")
django.setup()

from apps.analysis.services.code_runner import OneCompilerRunner

runner = OneCompilerRunner()

print("Testing Java...")
java_code = """
public class Main {
    public static void checkEvenOdd(int n) {
        if (n % 2 == 0) {
            System.out.println("Even");
        } else {
            System.out.println("Odd");
        }
    }

    public static void main(String[] args) {
        checkEvenOdd(10);
    }
}
"""
res = runner.run_code(java_code, "java")
print(f"Java result: {res}")

print("\nTesting Python...")
py_code = """
def check_even_odd(n):
    if n % 2 == 0:
        print("Even")
    else:
        print("Odd")

check_even_odd(10)
"""
res = runner.run_code(py_code, "python")
print(f"Python result: {res}")

print("\nTesting C...")
c_code = """
#include <stdio.h>

void checkEvenOdd(int n) {
    if (n % 2 == 0) {
        printf("Even\\n");
    } else {
        printf("Odd\\n");
    }
}

int main() {
    checkEvenOdd(10);
    return 0;
}
"""
res = runner.run_code(c_code, "c")
print(f"C result: {res}")

print("\nTesting C++...")
cpp_code = """
#include <iostream>
using namespace std;

void checkEvenOdd(int n) {
    if (n % 2 == 0) {
        cout << "Even" << endl;
    } else {
        cout << "Odd" << endl;
    }
}

int main() {
    checkEvenOdd(10);
    return 0;
}
"""
res = runner.run_code(cpp_code, "cpp")
print(f"C++ result: {res}")
