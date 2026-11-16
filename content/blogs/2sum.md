---
title: 2 Cool for 2 Sum
date: 2026-11-16
genre: coding
font: sans
layout: wide
excerpt: How to learn from 1st leetcode problem
---

> Is this problem actually easy and should you solve it easily?

## Problem
An array **nums** is given with **target** number where we have to find 2 indicies whose values when added gives the **target** number.

## Whats the fuss?
Two things:
- Easy to solve if not optimizing. (match every element with every other element until you find the 2 numbers which add to target)
- Using libs and calling apis.

First one i hope everyone understands its not meant to be solved in that manner.
For using libs point, see the below code...

```
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        
        int comp;
        unordered_map<int, int> map;
        for ( int i=0; i < nums.size(); i++)
        {
            comp = target - nums[i];
            
            if (map.count(comp))
            {
                return {map[comp], i};
            }
            
            map[nums[i]] = i;

        }
        return {};
    }
};
```
Here, we have utilized our brain to calculate
```
target - nums[i]
```
and using this value brings us closer to getting the second index as the first index is known.

BUT using
```
map.count(comp) and map[comp]
```
shows we just dont want to code but rather call apis.

## Whats the C way?
I think coding in c helps understand way to solve better as we need to implement the basics and not just api them.

```
#include<malloc.h>

typedef struct{
int key;
int value;
int occupied;
}mapidx;

int hash(int key, int len)
{
    int h = key % len;
    return (h < 0)? h + len : h;
}

/**
 * Note: The returned array must be malloced, assume caller calls free().
 */
int* twoSum(int* nums, int numsSize, int target, int* returnSize) {

    int *result = malloc(2 * sizeof(int));

    int capacity = 2 * (numsSize + 1);
    mapidx *maparray = (mapidx*)calloc(capacity, sizeof(mapidx));

    for( int i = 0; i < numsSize; i++)
    {
        int sub = target - nums[i];
        
        int idx = hash(sub, capacity);

        while (maparray[idx].occupied)
        {
            if (maparray[idx].key == sub)
            {
                result[0] = maparray[idx].value;
                result[1] = i;
                *returnSize = 2;
                free(maparray);
                return result;
            }
            idx = (idx + 1) % capacity;
        }

        int another_idx = hash(nums[i], capacity);
        while(maparray[another_idx].occupied)
        {
            another_idx = (another_idx + 1) % capacity;
        }
        if(maparray[another_idx].occupied == 0)
        {
            maparray[another_idx].key = nums[i];
            maparray[another_idx].value = i;
            maparray[another_idx].occupied = 1;
        }
    }
    free(maparray);
    return result;
}
```

Here there are many things which require some reasoning over the solving logic
- Creation of hash function to include negative interger values
- insertion, search through the struct using the hash function

This question has complexity for a begineer... and its good to understand how to optimize without direct api calls especially if you are learning to code.
---
Code to understand and learn the way machine works, not just solve.