CODING_QUESTIONS = {
    'Python': [
        {
            'id': 'py_fizzbuzz',
            'language': 'Python',
            'title': 'FizzBuzz',
            'description': 'Write a function that prints numbers from 1 to n. For multiples of 3, print "Fizz". For multiples of 5, print "Buzz". For multiples of both, print "FizzBuzz".',
            'starter_code': 'def fizzbuzz(n: int):\n    # Write your code here\n    pass\n\n# Test your code\nfizzbuzz(15)',
            'test_cases': [
                {'input': '15', 'expected_output': '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz'}
            ],
            'difficulty': 'easy'
        },
        {
            'id': 'py_rev_str',
            'language': 'Python',
            'title': 'Reverse a String',
            'description': 'Write a function that takes a string as input and returns the string reversed.',
            'starter_code': 'def reverse_string(s: str) -> str:\n    # Write your code here\n    pass\n\n# Test your code\nprint(reverse_string("hello"))',
            'test_cases': [
                {'input': 'hello', 'expected_output': 'olleh'}
            ],
            'difficulty': 'easy'
        },
        {
            'id': 'py_palindrome',
            'language': 'Python',
            'title': 'Check Palindrome',
            'description': 'Write a function that checks if a given string is a palindrome (reads the same forwards and backwards).',
            'starter_code': 'def is_palindrome(s: str) -> bool:\n    # Write your code here\n    pass\n\n# Test your code\nprint(is_palindrome("racecar"))',
            'test_cases': [
                {'input': 'racecar', 'expected_output': 'True'}
            ],
            'difficulty': 'easy'
        },
        {
            'id': 'py_max_list',
            'language': 'Python',
            'title': 'Find Max in List',
            'description': 'Write a function that takes a list of integers and returns the maximum value without using the built-in max() function.',
            'starter_code': 'def find_max(nums: list) -> int:\n    # Write your code here\n    pass\n\n# Test your code\nprint(find_max([1, 5, 2, 8, 3]))',
            'test_cases': [
                {'input': '[1, 5, 2, 8, 3]', 'expected_output': '8'}
            ],
            'difficulty': 'easy'
        },
        {
            'id': 'py_count_vowels',
            'language': 'Python',
            'title': 'Count Vowels',
            'description': 'Write a function that takes a string and returns the number of vowels (a, e, i, o, u) in it.',
            'starter_code': 'def count_vowels(s: str) -> int:\n    # Write your code here\n    pass\n\n# Test your code\nprint(count_vowels("interview"))',
            'test_cases': [
                {'input': 'interview', 'expected_output': '4'}
            ],
            'difficulty': 'easy'
        }
    ],
    'C': [
        {
            'id': 'c_swap',
            'language': 'C',
            'title': 'Swap Two Numbers',
            'description': 'Write a C program to swap two numbers without using a third variable. Print the swapped values space-separated.',
            'starter_code': '#include <stdio.h>\n\nvoid swap(int a, int b) {\n    // Write your code here\n}\n\nint main() {\n    swap(5, 10);\n    return 0;\n}',
            'test_cases': [
                {'input': '5 10', 'expected_output': '10 5'}
            ],
            'difficulty': 'easy'
        },
        {
            'id': 'c_factorial',
            'language': 'C',
            'title': 'Factorial',
            'description': 'Write a C program to compute and print the factorial of a number.',
            'starter_code': '#include <stdio.h>\n\nint factorial(int n) {\n    // Write your code here\n    return 1;\n}\n\nint main() {\n    printf("%d\\n", factorial(5));\n    return 0;\n}',
            'test_cases': [
                {'input': '5', 'expected_output': '120'}
            ],
            'difficulty': 'easy'
        },
        {
            'id': 'c_fibonacci',
            'language': 'C',
            'title': 'Nth Fibonacci',
            'description': 'Write a function to return the Nth Fibonacci number (where n=0 is 0, n=1 is 1).',
            'starter_code': '#include <stdio.h>\n\nint fib(int n) {\n    // Write your code here\n    return 0;\n}\n\nint main() {\n    printf("%d\\n", fib(6));\n    return 0;\n}',
            'test_cases': [
                {'input': '6', 'expected_output': '8'}
            ],
            'difficulty': 'easy'
        },
        {
            'id': 'c_sum_array',
            'language': 'C',
            'title': 'Sum of Array',
            'description': 'Write a C program to compute the sum of all elements in an array.',
            'starter_code': '#include <stdio.h>\n\nint sum_array(int arr[], int n) {\n    // Write your code here\n    return 0;\n}\n\nint main() {\n    int arr[] = {1, 2, 3, 4, 5};\n    printf("%d\\n", sum_array(arr, 5));\n    return 0;\n}',
            'test_cases': [
                {'input': '1 2 3 4 5', 'expected_output': '15'}
            ],
            'difficulty': 'easy'
        },
        {
            'id': 'c_is_prime',
            'language': 'C',
            'title': 'Check Prime',
            'description': 'Write a C program to check if a number is prime. Print 1 if prime, 0 if not.',
            'starter_code': '#include <stdio.h>\n\nint is_prime(int n) {\n    // Write your code here\n    return 0;\n}\n\nint main() {\n    printf("%d\\n", is_prime(7));\n    return 0;\n}',
            'test_cases': [
                {'input': '7', 'expected_output': '1'}
            ],
            'difficulty': 'easy'
        }
    ],
    'Java': [
        {
            'id': 'java_rev_str',
            'language': 'Java',
            'title': 'Reverse a String',
            'description': 'Write a method to reverse a given string.',
            'starter_code': 'public class Main {\n    public static String reverseString(String s) {\n        // Write your code here\n        return "";\n    }\n\n    public static void main(String[] args) {\n        System.out.println(reverseString("hello"));\n    }\n}',
            'test_cases': [
                {'input': 'hello', 'expected_output': 'olleh'}
            ],
            'difficulty': 'easy'
        },
        {
            'id': 'java_even_odd',
            'language': 'Java',
            'title': 'Check Even or Odd',
            'description': 'Write a method to check if a number is even or odd. Print "Even" or "Odd".',
            'starter_code': 'public class Main {\n    public static void checkEvenOdd(int n) {\n        // Write your code here\n    }\n\n    public static void main(String[] args) {\n        checkEvenOdd(10);\n    }\n}',
            'test_cases': [
                {'input': '10', 'expected_output': 'Even'}
            ],
            'difficulty': 'easy'
        },
        {
            'id': 'java_find_min',
            'language': 'Java',
            'title': 'Find Min in Array',
            'description': 'Write a method to find the minimum value in an integer array.',
            'starter_code': 'public class Main {\n    public static int findMin(int[] arr) {\n        // Write your code here\n        return 0;\n    }\n\n    public static void main(String[] args) {\n        int[] arr = {5, 2, 8, 1, 9};\n        System.out.println(findMin(arr));\n    }\n}',
            'test_cases': [
                {'input': '[5, 2, 8, 1, 9]', 'expected_output': '1'}
            ],
            'difficulty': 'easy'
        },
        {
            'id': 'java_anagram',
            'language': 'Java',
            'title': 'Valid Anagram',
            'description': 'Write a method to check if two strings are anagrams of each other. Print "true" or "false".',
            'starter_code': 'public class Main {\n    public static boolean isAnagram(String s, String t) {\n        // Write your code here\n        return false;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(isAnagram("listen", "silent"));\n    }\n}',
            'test_cases': [
                {'input': 'listen silent', 'expected_output': 'true'}
            ],
            'difficulty': 'easy'
        },
        {
            'id': 'java_fizzbuzz',
            'language': 'Java',
            'title': 'FizzBuzz',
            'description': 'Write a method to print FizzBuzz up to n.',
            'starter_code': 'public class Main {\n    public static void fizzbuzz(int n) {\n        // Write your code here\n    }\n\n    public static void main(String[] args) {\n        fizzbuzz(5);\n    }\n}',
            'test_cases': [
                {'input': '5', 'expected_output': '1\n2\nFizz\n4\nBuzz'}
            ],
            'difficulty': 'easy'
        }
    ]
}
